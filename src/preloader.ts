import gsap from 'gsap'
import './motion/tokens'
import { reducedMotion, ss, flags } from './lib/env'
import { site } from './lib/config'

const N = 28 // stitches around the star

/**
 * Preloader: the star sews itself. Stitch count = real load progress (lerped).
 * Gates only on the hero scene + fonts; later garments stream after.
 */
export function createPreloader() {
  const root = document.getElementById('preloader')!
  const skipped = root.classList.contains('skip') || flags.qa
  let total = 0
  let loaded = 0
  const track = <T,>(p: Promise<T>, weight = 1) => {
    total += weight
    p.catch(() => {}).finally(() => { loaded += weight })
    return p
  }

  const done = new Promise<void>((resolve) => {
    if (skipped) {
      root.classList.add('skip')
      resolve()
      return
    }
    const svg = root.querySelector<SVGSVGElement>('#pl-star')!
    const outline = svg.querySelector<SVGPathElement>('.pl-outline')!
    const fill = svg.querySelector<SVGPathElement>('.pl-fill')!
    const path = svg.querySelector<SVGPathElement>('.pl-stitch-path')!
    const g = svg.querySelector<SVGGElement>('.pl-stitches')!
    const len = path.getTotalLength()
    const lines: SVGLineElement[] = []
    for (let i = 0; i < N; i++) {
      const a = path.getPointAtLength((len * i) / N)
      const b = path.getPointAtLength((len * (i + 0.55)) / N)
      const l = document.createElementNS('http://www.w3.org/2000/svg', 'line')
      l.setAttribute('x1', String(a.x)); l.setAttribute('y1', String(a.y))
      l.setAttribute('x2', String(b.x)); l.setAttribute('y2', String(b.y))
      g.appendChild(l)
      lines.push(l)
    }

    const t0 = performance.now()
    const { min, timeout } = site.timings.preloader
    gsap.to(outline, { strokeDashoffset: 0, duration: reducedMotion ? 0 : 0.6, ease: 'ap.settle' })

    let shown = 0
    let disp = 0
    const tick = () => {
      const elapsed = (performance.now() - t0) / 1000
      const real = total ? loaded / total : 1
      const forced = elapsed > timeout
      disp += ((forced ? 1 : real) - disp) * 0.12 // lerp toward the real value
      if (disp > 0.995) disp = 1
      const count = Math.floor(disp * N) // ap.stitch: whole stitches only
      while (shown < count) lines[shown++].style.opacity = '1'
      if ((disp === 1 && elapsed >= min) || forced) {
        gsap.ticker.remove(tick)
        complete()
      }
    }
    gsap.ticker.add(tick)

    const complete = () => {
      const tl = gsap.timeline({ onComplete: () => { ss.set('ap-seen', '1'); resolve() } })
      tl.to(fill, { scale: 1, duration: 0.3, ease: 'ap.cut' })
      tl.to(lines, { stroke: '#0b0b0b', duration: 0.15, ease: 'none' }, '<0.15')
      tl.add(() => {
        const slot = document.getElementById('nav-star')
        if (!slot) return
        const a = svg.getBoundingClientRect()
        const b = slot.getBoundingClientRect()
        const dx = b.left + b.width / 2 - (a.left + a.width / 2)
        const dy = b.top + b.height / 2 - (a.top + a.height / 2)
        gsap.to(svg, { x: dx, y: dy, scale: b.width / a.width, duration: reducedMotion ? 0 : 0.7, ease: 'ap.cut' })
        gsap.to(root, { backgroundColor: 'rgba(11,11,11,0)', duration: 0.7, ease: 'ap.cut' })
        window.dispatchEvent(new CustomEvent('ap:handoff'))
      })
      tl.to({}, { duration: reducedMotion ? 0 : 0.7 })
      tl.add(() => root.classList.add('skip'))
    }
  })

  return { track, done, skipped }
}
