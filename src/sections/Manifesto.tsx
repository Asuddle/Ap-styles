import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { site, ph } from '../lib/config'
import { useTimings } from '../motion/scroll'
import { apStitch } from '../motion/tokens'
import { reducedMotion } from '../lib/env'

gsap.registerPlugin(ScrollTrigger, SplitText)

export function factLine() {
  const f = site.factory
  return `${ph(f.years, 'YEARS')} YEARS · ${ph(f.floorSqFt, 'SQ FT')} SQ FT FLOOR · ${ph(f.machines, 'N')} MACHINES`
}

export function Manifesto() {
  const text = useRef<HTMLParagraphElement>(null)
  const under = useRef<HTMLSpanElement>(null)
  const fact = useRef<HTMLSpanElement>(null)
  const L = useTimings().manifesto
  const full: string = site.manifesto.text
  const key: string = site.manifesto.keyPhrase
  const [before, after] = full.split(key)
  const facts = factLine()

  useEffect(() => {
    const p = text.current
    if (!p || !fact.current || !under.current) return
    if (reducedMotion) {
      fact.current.textContent = facts
      gsap.set(under.current, { clipPath: 'inset(0 0% 0 0)' })
      return
    }
    let split: SplitText | null = null
    let st: ScrollTrigger | null = null
    let killed = false
    document.fonts.ready.then(() => {
      if (killed) return
      // split after fonts are ready; autoSplit re-splits only when the width changes
      split = SplitText.create(p, {
        type: 'lines',
        mask: 'lines',
        autoSplit: true,
        onSplit(self) {
          gsap.set(self.lines, { yPercent: 100 })
          if (st?.progress) gsap.set(self.lines, { yPercent: 0 })
        },
      })
      st = ScrollTrigger.create({
        trigger: p,
        start: 'top 75%',
        once: true,
        onEnter: () => {
          const lines = split!.lines
          const tl = gsap.timeline()
          tl.to(lines, { yPercent: 0, duration: 0.7, ease: 'ap.settle', stagger: 0.05 })
          // key phrase: dashed stitch underline sews itself left to right, 0.2 s after its line
          const keyLine = lines.findIndex((l) => l.contains(under.current))
          const dashes = Math.max(6, Math.round((under.current!.offsetWidth || 120) / 10))
          tl.to(under.current, { clipPath: 'inset(0 0% 0 0)', duration: 0.6, ease: apStitch(dashes) }, Math.max(0, keyLine) * 0.05 + 0.2)
          // fact line types on like a label printer, 0.02 s per character
          const o = { n: 0 }
          tl.to(o, {
            n: facts.length, duration: facts.length * 0.02, ease: 'none',
            onUpdate: () => { fact.current!.textContent = facts.slice(0, Math.round(o.n)) },
          }, '>-0.2')
        },
      })
    })
    return () => { killed = true; st?.kill(); split?.revert() }
  }, [facts])

  return (
    <section data-section="manifesto" data-flow="1" data-len={L} className="manifesto" style={{ minHeight: `${L}vh` }} aria-labelledby="manifesto-title">
      <h2 id="manifesto-title" className="sr-only">Why AP-Star exists</h2>
      <div className="manifesto-inner">
        <p ref={text} className="manifesto-text display">
          {before}
          <span className="key">
            {key}
            <span ref={under} className="stitch-u" aria-hidden="true" />
          </span>
          {after}
        </p>
        <p className="mono label fact">
          <span className="sr-only">{facts}</span>
          <span ref={fact} aria-hidden="true" />
        </p>
      </div>
    </section>
  )
}
