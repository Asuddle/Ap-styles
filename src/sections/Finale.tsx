import { useEffect, useRef, useState, type FormEvent } from 'react'
import gsap from 'gsap'
import { site, garments } from '../lib/config'
import { rt, useUI } from '../state/store'
import { onTick, useTimings } from '../motion/scroll'
import { apStitch } from '../motion/tokens'
import { reducedMotion } from '../lib/env'
import { useStage } from './useStage'
import { dropDateLabel } from './Hero'
import { dropIsLive } from './DropRoom'

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000))
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 }
}
const pad = (n: number) => String(n).padStart(2, '0')

function Digit({ value }: { value: string }) {
  const el = useRef<HTMLSpanElement>(null)
  const prev = useRef(value)
  useEffect(() => {
    if (prev.current === value || !el.current) return
    prev.current = value
    // live tick: quick vertical slide, 0.25 s ap.cut
    if (!reducedMotion) gsap.fromTo(el.current, { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.25, ease: 'ap.cut' })
  }, [value])
  return <span ref={el} className="digit">{value}</span>
}

function Countdown() {
  const date = site.drop.date as string
  const target = date ? new Date(date).getTime() : null
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (!target) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [target])
  const p = target ? parts(target - now) : null
  const cells = [
    { k: 'Days', v: p ? pad(p.d) : '--' },
    { k: 'Hours', v: p ? pad(p.h) : '--' },
    { k: 'Minutes', v: p ? pad(p.m) : '--' },
    { k: 'Seconds', v: p ? pad(p.s) : '--' },
  ]
  return (
    <div className="countdown" role="timer" aria-label={p ? `${p.d} days ${p.h} hours ${p.m} minutes until ${site.drop.name}` : `${site.drop.name} date to be announced`}>
      {cells.map((c) => (
        <div key={c.k} className="cd-cell" aria-hidden="true">
          <span className="cd-digits display">
            {c.v.split('').map((ch, i) => <span key={i} className="flap"><Digit value={ch} /></span>)}
          </span>
          <span className="mono label">{c.k}</span>
        </div>
      ))}
    </div>
  )
}

function Waitlist() {
  const [state, setState] = useState<'idle' | 'sewing' | 'done'>('idle')
  const [error, setError] = useState<string | null>(null)
  const btn = useRef<HTMLButtonElement>(null)
  const seam = useRef<SVGSVGElement>(null)
  const msg = useRef<HTMLParagraphElement>(null)

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const phone = String(f.get('phone') ?? '').trim()
    const email = String(f.get('email') ?? '').trim()
    const consent = f.get('consent') === 'on'
    if (!phone && !email) return setError('Add a phone number or an email.')
    if (phone && !/^[+()\-\s\d]{7,}$/.test(phone)) return setError('That phone number looks incomplete.')
    if (email && !/^\S+@\S+\.\S+$/.test(email)) return setError('That email looks incomplete.')
    if (phone && !consent) return setError('Tick the consent box to get texts.')
    setError(null)
    // nothing is stored or sent: this is a prototype
    setState('sewing')
    if (reducedMotion) { setState('done'); return }
    requestAnimationFrame(() => {
      const dashes = seam.current?.querySelectorAll('line') ?? []
      gsap.timeline({ onComplete: () => setState('done') })
        .to(btn.current, { opacity: 0, duration: 0.15, ease: 'ap.cut' })
        .fromTo(dashes, { opacity: 0 }, { opacity: 1, duration: 0.6, ease: apStitch(dashes.length), stagger: 0.6 / Math.max(1, dashes.length) }, '<')
    })
  }
  useEffect(() => {
    if (state === 'done' && msg.current) {
      msg.current.focus()
      if (!reducedMotion) gsap.fromTo(msg.current, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.7, ease: 'ap.settle' })
    }
  }, [state])

  if (state === 'done')
    return (
      <div className="form-done">
        <p ref={msg} tabIndex={-1} className="display done-msg">You're on the list. #[POSITION]</p>
        <p className="mono label muted">Demo only: nothing was stored or sent.</p>
      </div>
    )

  return (
    <form className="waitlist" onSubmit={submit} noValidate aria-describedby="demo-note">
      <div className="fields">
        {site.drop.waitlist.sms && (
          <label className="field">
            <span className="mono label">Phone (SMS)</span>
            <input name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="+1 555 000 0000" />
          </label>
        )}
        {site.drop.waitlist.email && (
          <label className="field">
            <span className="mono label">Email</span>
            <input name="email" type="email" autoComplete="email" placeholder="you@example.com" />
          </label>
        )}
      </div>
      <label className="consent">
        <input type="checkbox" name="consent" />
        <span>{site.finale.consent}</span>
      </label>
      {error && <p className="form-error mono" role="alert">{error}</p>}
      <div className="submit-wrap">
        <button ref={btn} className="btn submit" type="submit" disabled={state === 'sewing'}>Join the waitlist</button>
        {state === 'sewing' && (
          <svg ref={seam} className="seam" viewBox="0 0 300 8" aria-hidden="true">
            {Array.from({ length: 20 }, (_, i) => <line key={i} x1={i * 15 + 2} x2={i * 15 + 10} y1="4" y2="4" />)}
          </svg>
        )}
      </div>
      <p id="demo-note" className="mono label muted">Prototype: this form doesn't store or send anything.</p>
    </form>
  )
}

export function Finale() {
  const stage = useRef<HTMLDivElement>(null)
  const reveal = useRef<HTMLDivElement>(null)
  const section = useUI((s) => s.section)
  const L = useTimings().finale
  const live = dropIsLive()
  useStage('finale', stage, 0.65, ['footer'])

  // lights switch off back to front with a hard click, 0.1 s each, as the section enters
  useEffect(() => {
    if (section === 'finale') {
      const tl = gsap.timeline()
      const n = garments.length
      for (let i = 0; i <= n; i++) tl.to(rt.spot, { [i]: 0, duration: 0.02, ease: 'none' }, i * 0.1)
      tl.to(rt, { finaleLights: 0.25, duration: 0.3, ease: 'ap.cut' }, n * 0.1)
      return () => { tl.kill() }
    } else if (section !== 'footer') {
      gsap.to(rt, { finaleLights: 1, duration: 0.2, ease: 'ap.cut' })
    }
  }, [section])

  // at 60%: digits flip in like a split-flap board; form reveals
  useEffect(() => {
    let shown = false
    return onTick(() => {
      const el = reveal.current
      if (!el) return
      const p = rt.sections.finale?.p ?? 0
      const want = (rt.active === 'finale' && p >= 0.6) || rt.active === 'footer'
      if (want === shown) return
      shown = want
      if (reducedMotion) { gsap.set(el, { autoAlpha: want ? 1 : 0 }); return }
      if (want) {
        gsap.set(el, { autoAlpha: 1 })
        gsap.fromTo(el.querySelectorAll('.flap'), { rotateX: -90, opacity: 0 }, { rotateX: 0, opacity: 1, duration: 0.3, ease: 'ap.cut', stagger: 0.04 })
        gsap.fromTo(el.querySelectorAll('.reveal-settle'), { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.7, ease: 'ap.settle', stagger: 0.05, delay: 0.2 })
      } else gsap.to(el, { autoAlpha: 0, duration: 0.3, ease: 'ap.cut' })
    })
  }, [])

  return (
    <section data-section="finale" data-len={L} style={{ height: `${L + 100}vh` }} aria-labelledby="finale-title" id="waitlist">
      <div ref={stage} className="stage finale-stage">
        <div ref={reveal} className="finale-inner" style={{ visibility: 'hidden' }}>
          <p className="mono label reveal-settle" id="finale-title">{`${site.drop.name.toUpperCase()} — ${dropDateLabel()}`}</p>
          {live ? (
            <button className="btn big reveal-settle" onClick={() => useUI.getState().set({ toast: 'Demo: the shop is not connected yet.' })}>
              {`Shop ${site.drop.name}`}
            </button>
          ) : (
            <>
              <Countdown />
              <p className="finale-line reveal-settle">{site.finale.line}</p>
              <div className="reveal-settle"><Waitlist /></div>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
