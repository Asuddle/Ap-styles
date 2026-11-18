import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { site } from '../lib/config'
import { rt, useUI } from '../state/store'
import { onTick, scrollToSection, useTimings } from '../motion/scroll'
import { range } from '../motion/tokens'
import { reducedMotion } from '../lib/env'
import { useStage } from './useStage'

export function dropDateLabel() {
  const d = site.drop.date
  if (!d) return '[DATE]'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()
}

export function Hero() {
  const stage = useRef<HTMLDivElement>(null)
  const h1 = useRef<HTMLHeadingElement>(null)
  const details = useRef<HTMLDivElement>(null)
  const cue = useRef<HTMLDivElement>(null)
  const ready = useUI((s) => s.ready)
  const L = useTimings().hero
  useStage('hero', stage, 0)

  // headline lines reveal 0.9 s ap.settle, 0.05 s stagger, starting at 40% of the chalk draw (1.2 s)
  useEffect(() => {
    if (!h1.current) return
    const lines = h1.current.querySelectorAll('.line')
    if (!ready) { if (!reducedMotion) gsap.set(lines, { yPercent: 105 }); return }
    if (reducedMotion) { gsap.set(lines, { yPercent: 0 }); gsap.set(details.current, { opacity: 1 }); return }
    gsap.fromTo(lines, { yPercent: 105 }, { yPercent: 0, duration: 0.9, ease: 'ap.settle', stagger: 0.05, delay: 0.48 })
    gsap.fromTo(details.current, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.7, ease: 'ap.settle', delay: 0.7 })
  }, [ready])

  useEffect(() => {
    let shown = true
    return onTick(() => {
      const vh = rt.vh
      const y = rt.y
      // headline drifts up at 0.6× scroll (scrubbed); scroll cue fades over the first 15vh
      if (h1.current && !reducedMotion) h1.current.style.transform = `translate3d(0, ${-0.6 * Math.min(y, 1.6 * vh)}px, 0)`
      if (cue.current) cue.current.style.opacity = String(1 - range(y, 0, 0.15 * vh))
      // body text is never scrubbed: the details block swaps out time-based once the laser starts
      const want = y < 0.1 * vh
      if (want !== shown && details.current && useUI.getState().ready) {
        shown = want
        gsap.to(details.current, { opacity: want ? 1 : 0, y: want ? 0 : -12, duration: 0.3, ease: 'ap.cut', overwrite: 'auto' })
      }
    })
  }, [])

  return (
    <section data-section="hero" data-len={L} style={{ height: `${L + 100}vh` }} aria-labelledby="hero-title">
      <div ref={stage} className="stage hero-stage">
        <div className="hero-copy">
          <h1 ref={h1} id="hero-title" className="display hero-title">
            {(site.hero.copy.headline as string[]).map((l) => (
              <span key={l} className="mask"><span className="line">{l}</span></span>
            ))}
          </h1>
          <div ref={details} className="hero-details">
            <p className="hero-sub">{site.hero.copy.subline}</p>
            <p className="mono label">{`${site.drop.name.toUpperCase()} — ${dropDateLabel()}`}</p>
            <button className="btn" onClick={() => scrollToSection('finale', 0.65)}>Join the waitlist</button>
          </div>
        </div>
        <div ref={cue} className="scroll-cue mono" aria-hidden="true">
          SCROLL <span className="cue-line" />
        </div>
      </div>
    </section>
  )
}
