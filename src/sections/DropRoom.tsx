import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { site, garments, fmtPrice, fabricLine } from '../lib/config'
import { rt, useUI } from '../state/store'
import { onTick, useTimings, lenis, scrollToY } from '../motion/scroll'
import { isTouch, reducedMotion } from '../lib/env'
import { useStage } from './useStage'
import { openInspect } from './inspect'

export const dropIsLive = () => !!site.drop.date && Date.now() >= new Date(site.drop.date).getTime()

export function DropRoomSection() {
  const stage = useRef<HTMLDivElement>(null)
  const card = useRef<HTMLDivElement>(null)
  const beat = useUI((s) => s.beat)
  const inspect = useUI((s) => s.inspect)
  const t = useTimings()
  const L = t.dropIntro + t.dropBeat * garments.length
  const g = garments[beat]
  const n = garments.length
  useStage('drop', stage, (t.dropIntro + 0.55 * t.dropBeat) / L)

  // card state machine: enter at 30% of a beat, exit at 80%
  useEffect(() => {
    let shown = false
    let shownBeat = -1
    return onTick(() => {
      const c = card.current
      if (!c) return
      const local = rt.dropBeat - Math.floor(rt.dropBeat)
      const b = Math.min(n - 1, Math.floor(rt.dropBeat))
      const inDrop = rt.active === 'drop' && rt.dropIntro >= 1
      const want = !!useUI.getState().inspect ? false : inDrop && (reducedMotion || (local >= 0.3 && local < 0.8) || (b === n - 1 && local >= 0.3))
      if (want === shown && b === shownBeat) return
      if (want && (!shown || b !== shownBeat)) {
        shown = true
        shownBeat = b
        const items = c.querySelectorAll('.ci')
        if (reducedMotion) { gsap.set(c, { autoAlpha: 1 }); gsap.set(items, { opacity: 1, y: 0 }); return }
        gsap.set(c, { autoAlpha: 1, y: 0 })
        // name 0.7 s ap.settle, each next item starting at 50% of the previous
        gsap.fromTo(items, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.7, ease: 'ap.settle', stagger: 0.35, overwrite: 'auto' })
      } else if (!want && shown) {
        shown = false
        gsap.to(c, { autoAlpha: 0, y: -24, duration: 0.3, ease: 'ap.cut', overwrite: 'auto' })
      }
    })
  }, [n])

  // mobile: snap softly to each hold once the scroll comes to rest
  useEffect(() => {
    if (!isTouch || !lenis) return
    let timer: number | undefined
    const onScroll = () => {
      clearTimeout(timer)
      timer = window.setTimeout(() => {
        const s = rt.sections.drop
        if (!s || rt.active !== 'drop' || useUI.getState().inspect) return
        const tt = useTimings()
        const pxPerVh = rt.vh / 100
        const vhIn = (window.scrollY - s.start) / pxPerVh
        if (vhIn < tt.dropIntro) return
        const b = Math.min(garments.length - 1, Math.floor((vhIn - tt.dropIntro) / tt.dropBeat))
        const hold = s.start + (tt.dropIntro + (b + 0.575) * tt.dropBeat) * pxPerVh
        if (Math.abs(hold - window.scrollY) > 4) scrollToY(hold)
      }, 180)
    }
    lenis.on('scroll', onScroll)
    return () => { lenis?.off('scroll', onScroll); clearTimeout(timer) }
  }, [])

  const live = dropIsLive()
  return (
    <section data-section="drop" data-len={L} style={{ height: `${L}vh` }} aria-labelledby="drop-title">
      <div ref={stage} className="stage drop-stage">
        <h2 id="drop-title" className="sr-only">{`${site.drop.name}: the collection`}</h2>
        <div ref={card} className="product-card" aria-live="polite" hidden={false}>
          <p className="mono label ci">{`${String(beat + 1).padStart(2, '0')}/${String(n).padStart(2, '0')}`}</p>
          <h3 className="display card-name ci">{g.name}</h3>
          <p className="mono ci">{fmtPrice(g.price)}</p>
          <p className="mono label ci">{fabricLine(g)}</p>
          <div className="card-actions ci">
            <button className="btn" onClick={() => useUI.getState().set({ toast: live ? 'Demo: the bag is not connected yet.' : 'Demo: notifications are not connected yet.' })}>
              {live ? 'Add to bag' : 'Notify me'}
            </button>
            <button className="btn btn-ghost" onClick={() => openInspect(g.slug)} aria-expanded={!!inspect}>
              Inspect
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
