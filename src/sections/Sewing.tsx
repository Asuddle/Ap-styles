import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { site, garmentBySlug, ph } from '../lib/config'
import { rt } from '../state/store'
import { onTick, useTimings } from '../motion/scroll'
import { reducedMotion } from '../lib/env'
import { useStage } from './useStage'

const seams = site.sewing.seams as { id: string; label: string }[]

export function Sewing() {
  const stage = useRef<HTMLDivElement>(null)
  const cap = useRef<HTMLSpanElement>(null)
  const idx = useRef<HTMLSpanElement>(null)
  const end = useRef<HTMLDivElement>(null)
  const L = useTimings().sewing
  const g = garmentBySlug(site.hero.garment)!
  useStage('sewing', stage, 0.5)

  useEffect(() => {
    let cur = -2
    let endShown = false
    return onTick(() => {
      const p = rt.view.sewing ?? 0
      // caption swaps at each seam start (0.3 s ap.cut)
      const span = 0.55 / seams.length
      const i = p < 0.2 ? -1 : Math.min(seams.length - 1, Math.floor((p - 0.2) / span))
      if (i !== cur && cap.current && idx.current) {
        cur = i
        const label = i < 0 ? 'PANELS TO BODY' : seams[i].label
        const n = i < 0 ? '00' : String(i + 1).padStart(2, '0')
        if (reducedMotion) {
          cap.current.textContent = label
          idx.current.textContent = `${n}/${String(seams.length).padStart(2, '0')}`
        } else {
          gsap.timeline()
            .to(cap.current, { yPercent: -100, duration: 0.15, ease: 'ap.cut' })
            .add(() => {
              cap.current!.textContent = label
              idx.current!.textContent = `${n}/${String(seams.length).padStart(2, '0')}`
            })
            .fromTo(cap.current, { yPercent: 100 }, { yPercent: 0, duration: 0.15, ease: 'ap.cut' })
        }
      }
      const wantEnd = p >= 0.85
      if (wantEnd !== endShown && end.current) {
        endShown = wantEnd
        gsap.to(end.current, { opacity: wantEnd ? 1 : 0, y: wantEnd ? 0 : 12, duration: wantEnd ? 0.7 : 0.3, ease: wantEnd ? 'ap.settle' : 'ap.cut', overwrite: 'auto' })
      }
    })
  }, [])

  return (
    <section data-section="sewing" data-len={L} style={{ height: `${L}vh` }} aria-labelledby="sewing-title">
      <div ref={stage} className="stage sewing-stage">
        <h2 id="sewing-title" className="sr-only">The sewing line</h2>
        <div className="caption mono">
          <span className="caption-idx" ref={idx}>00/05</span>
          <span className="caption-mask"><span ref={cap} className="caption-text">PANELS TO BODY</span></span>
        </div>
        <ul className="sr-only">
          {seams.map((s) => <li key={s.id}>{s.label}</li>)}
        </ul>
        <div ref={end} className="garment-end">
          <p className="display garment-name">{g.name}</p>
          <p className="mono label">{`${g.name.toUpperCase()} — ${ph(g.fabric.gsm, 'GSM')} GSM ${ph(g.fabric.composition, 'COTTON FLEECE')}`}</p>
        </div>
      </div>
    </section>
  )
}
