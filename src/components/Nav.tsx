import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { useUI } from '../state/store'
import { scrollToSection } from '../motion/scroll'
import { reducedMotion } from '../lib/env'

export const STAR = 'M50 2 C53 38 62 47 98 50 C62 53 53 62 50 98 C47 62 38 53 2 50 C38 47 47 38 50 2 Z'
export const STAR_STITCH = 'M50 16 C52.2 42 58 47.8 84 50 C58 52.2 52.2 58 50 84 C47.8 58 42 52.2 16 50 C42 47.8 47.8 42 50 16 Z'

/** Logo star: four-point concave star (pattern-piece shape) with a dashed stitch line inside. */
export function Star({ size = 28, id }: { size?: number; id?: string }) {
  return (
    <svg id={id} className="star" width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <path d={STAR} fill="var(--accent)" />
      <path d={STAR_STITCH} fill="none" stroke="var(--bg)" strokeWidth="4" strokeDasharray="6 5" strokeLinecap="round" />
    </svg>
  )
}

const WORD = 'AP-STAR'

export function Nav() {
  const ready = useUI((s) => s.ready)
  const word = useRef<HTMLSpanElement>(null)
  const star = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (!word.current) return
    const letters = word.current.querySelectorAll('.wl')
    if (!ready) { if (!reducedMotion) gsap.set(letters, { yPercent: 110 }); return }
    gsap.set(star.current, { opacity: 1 })
    if (reducedMotion) { gsap.set(letters, { yPercent: 0 }); return }
    // letters slide in beside the star, 0.03 s stagger
    gsap.fromTo(letters, { yPercent: 110 }, { yPercent: 0, duration: 0.7, ease: 'ap.cut', stagger: 0.03 })
  }, [ready])
  return (
    <header className="nav">
      <a href="#main" className="brand" aria-label="AP-Star, back to top" onClick={(e) => { e.preventDefault(); scrollToSection('hero', 0) }}>
        <span ref={star} className="nav-star"><Star size={30} id="nav-star" /></span>
        <span ref={word} className="wordmark" aria-hidden="true">
          {WORD.split('').map((c, i) => (
            <span key={i} className="wl-mask"><span className="wl">{c}</span></span>
          ))}
        </span>
      </a>
      <button className="btn btn-ghost nav-cta" onClick={() => scrollToSection('finale', 0.65)}>
        Join the waitlist
      </button>
    </header>
  )
}
