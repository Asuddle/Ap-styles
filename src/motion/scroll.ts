import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { site, garments } from '../lib/config'
import { reducedMotion, flags } from '../lib/env'
import { rt, useUI, SECTION_IDS, type SectionId } from '../state/store'
import { clamp01 } from './tokens'

gsap.registerPlugin(ScrollTrigger)

export let lenis: Lenis | null = null
type Tick = (time: number, dt: number) => void
const ticks = new Set<Tick>()
/** Register a per-frame callback on the single GSAP ticker loop. */
export const onTick = (fn: Tick) => {
  ticks.add(fn)
  return () => { ticks.delete(fn) }
}

const proxy = { y: 0 }

/** Measure section windows from the DOM (data-section, data-flow for in-flow sections). */
export function measure() {
  rt.vh = window.innerHeight
  for (const id of SECTION_IDS) {
    const el = document.querySelector<HTMLElement>(`[data-section="${id}"]`)
    if (!el) continue
    const top = el.offsetTop
    const len = Number(el.dataset.len ?? 0) * rt.vh / 100
    const flow = el.dataset.flow === '1'
    const start = flow ? top - rt.vh : top
    const end = flow ? top + el.offsetHeight : top + len
    rt.sections[id] = { id, start, end, p: rt.sections[id]?.p ?? 0 }
  }
}

function updateSections() {
  const y = rt.y
  let active: SectionId = 'hero'
  for (const id of SECTION_IDS) {
    const s = rt.sections[id]
    if (!s) continue
    s.p = clamp01((y - s.start) / Math.max(1, s.end - s.start))
    if (y >= s.start - 1) active = id
  }
  // drop room: intro then one beat per garment
  const d = rt.sections.drop
  if (d) {
    const t = useTimings()
    const total = t.dropIntro + t.dropBeat * garments.length
    const vhIn = d.p * total
    rt.dropIntro = clamp01(vhIn / t.dropIntro)
    rt.dropBeat = Math.max(0, (vhIn - t.dropIntro) / t.dropBeat)
  }
  updateView()
  if (active !== rt.active) {
    rt.active = active
    useUI.getState().set({ section: active })
  }
  const beat = Math.min(garments.length - 1, Math.floor(rt.dropBeat))
  if (beat !== useUI.getState().beat) useUI.getState().set({ beat })
}

export function useTimings() {
  return window.innerWidth < 768 ? site.timings.mobile : site.timings.desktop
}

/**
 * Visual progress. Normal: equals scroll progress. Reduced motion: the scene shows
 * stills (start / middle / end of each section, one hold per garment) and changes
 * between them with a short crossfade through black instead of scrubbing.
 */
let fading = false
function updateView() {
  if (!reducedMotion) {
    for (const id of SECTION_IDS) rt.view[id] = rt.sections[id]?.p ?? 0
    rt.viewBeat = rt.dropBeat
    rt.viewIntro = rt.dropIntro
    return
  }
  const q: Record<string, number> = {}
  for (const id of SECTION_IDS) q[id] = Math.round((rt.sections[id]?.p ?? 0) * 2) / 2
  const beat = Math.min(garments.length - 1, Math.floor(rt.dropBeat)) + 0.575
  const intro = rt.dropIntro >= 0.5 ? 1 : 0
  const changed =
    SECTION_IDS.some((id) => q[id] !== rt.view[id]) || beat !== rt.viewBeat || intro !== rt.viewIntro
  if (!changed || fading) return
  const apply = () => {
    Object.assign(rt.view, q)
    rt.viewBeat = beat
    rt.viewIntro = intro
    rt.needsRender = true
  }
  if (rt.view.hero === undefined) return apply()
  fading = true
  gsap.to(rt, {
    stillFade: 1, duration: 0.2, ease: 'none',
    onComplete: () => {
      apply()
      gsap.to(rt, { stillFade: 0, duration: 0.25, ease: 'none', delay: 0.05, onComplete: () => { fading = false } })
    },
  })
}

let lastY = -1
let inited = false
export function initScroll() {
  if (inited) return
  inited = true
  if (!reducedMotion && !flags.qa) {
    lenis = new Lenis({ autoRaf: false, lerp: 0.12, wheelMultiplier: 1 })
    lenis.on('scroll', ScrollTrigger.update)
  }
  // one loop: Lenis + ScrollTrigger + scene all run on gsap.ticker
  gsap.ticker.lagSmoothing(0)
  let prev = 0
  gsap.ticker.add((time) => {
    lenis?.raf(time * 1000)
    rt.rawY = window.scrollY
    if (reducedMotion || flags.qa) proxy.y = rt.rawY
    rt.y = proxy.y
    rt.time = time
    if (rt.y !== lastY) {
      rt.needsRender = true
      lastY = rt.y
    }
    updateSections()
    const dt = prev ? time - prev : 0.016
    prev = time
    ticks.forEach((fn) => fn(time, dt))
  })

  // smoothed scroll value: scrub 0.6 on top of Lenis
  if (!reducedMotion && !flags.qa) {
    gsap.to(proxy, {
      y: () => ScrollTrigger.maxScroll(window),
      ease: 'none',
      scrollTrigger: { start: 0, end: 'max', scrub: site.timings.scrub, invalidateOnRefresh: true },
    })
  }
  ScrollTrigger.addEventListener('refresh', measure)
  let w = window.innerWidth
  window.addEventListener('resize', () => {
    measure()
    if (window.innerWidth !== w) {
      w = window.innerWidth
      ScrollTrigger.refresh()
    }
  })
  measure()
}

export function scrollToY(y: number, immediate = false) {
  if (lenis) lenis.scrollTo(y, { immediate, duration: 1.1, easing: gsap.parseEase('ap.cut') as any })
  else window.scrollTo({ top: y, behavior: immediate || reducedMotion ? 'auto' : 'smooth' })
}

/** Scroll to a section at a given progress. */
export function scrollToSection(id: SectionId, p = 0, immediate = false) {
  measure()
  const s = rt.sections[id]
  if (!s) return
  scrollToY(s.start + (s.end - s.start) * p + 1, immediate)
}

/** Scroll to the hold of drop-room beat b (or into the intro with b < 0: -1..0). */
export function scrollToBeat(b: number, immediate = false) {
  measure()
  const s = rt.sections.drop
  if (!s) return
  const t = useTimings()
  const vhIn = b < 0 ? t.dropIntro * (1 + b) : t.dropIntro + (b + 0.575) * t.dropBeat
  scrollToY(s.start + (vhIn * rt.vh) / 100 + 1, immediate)
}

/** QA / debug hook */
;(window as any).__ap = { rt, scrollToSection, scrollToBeat, measure }
