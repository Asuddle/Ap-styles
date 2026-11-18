import { StrictMode, useEffect, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import gsap from 'gsap'
import './motion/tokens'
import { initScroll, onTick, measure, scrollToSection } from './motion/scroll'
import { rt, useUI } from './state/store'
import { flags, reducedMotion } from './lib/env'
import { range } from './motion/tokens'
import { Stage } from './three/Stage'
import { Nav } from './components/Nav'
import { Hero } from './sections/Hero'
import { Manifesto } from './sections/Manifesto'
import { Sewing } from './sections/Sewing'
import { DropRoomSection } from './sections/DropRoom'
import { FittingRoomSection } from './sections/FittingRoom'
import { Finale } from './sections/Finale'
import { Footer } from './sections/Footer'
import { InspectPanel } from './sections/InspectPanel'
import { DebugOverlay } from './debug/DebugOverlay'
import { Toast } from './components/Toast'

/** Boot: chalk lines draw on (1.2 s ap.settle), strip light flickers on twice then holds (0.4 s, the only flicker). */
function boot() {
  if (reducedMotion) {
    rt.boot = 1
    rt.light = 1
    return
  }
  gsap.to(rt, { boot: 1, duration: 1.2, ease: 'ap.settle' })
  gsap.timeline()
    .set(rt, { light: 1 }).set(rt, { light: 0 }, 0.06).set(rt, { light: 1 }, 0.14)
    .set(rt, { light: 0 }, 0.2).set(rt, { light: 1 }, 0.4)
}

function Overlays() {
  const dim = useRef<HTMLDivElement>(null)
  const fade = useRef<HTMLDivElement>(null)
  useEffect(
    () =>
      onTick(() => {
        // manifesto: canvas dims to 20% (scrubbed, linear)
        const p = rt.sections.manifesto?.p ?? 0
        const k = range(p, 0, 0.25) - range(p, 0.75, 1)
        if (dim.current) dim.current.style.opacity = String(0.8 * Math.max(0, k))
        if (fade.current) fade.current.style.opacity = String(rt.stillFade)
      }),
    [],
  )
  return (
    <>
      <div ref={dim} className="dim" aria-hidden="true" />
      <div ref={fade} className="still-fade" aria-hidden="true" />
    </>
  )
}

function App() {
  useEffect(() => {
    initScroll()
    const id = requestAnimationFrame(() => measure())
    return () => cancelAnimationFrame(id)
  }, [])
  return (
    <>
      <a
        className="skip-link"
        href="#waitlist"
        onClick={(e) => {
          e.preventDefault()
          scrollToSection('finale', 0.65, true)
          setTimeout(() => document.querySelector<HTMLInputElement>('.waitlist input')?.focus({ preventScroll: true }), 400)
        }}
      >
        Skip to the waitlist
      </a>
      <Stage />
      <Overlays />
      <Nav />
      <main id="main">
        <Hero />
        <Manifesto />
        <Sewing />
        <DropRoomSection />
        <FittingRoomSection />
        <Finale />
      </main>
      <Footer />
      <InspectPanel />
      <Toast />
      {flags.debug && <DebugOverlay />}
    </>
  )
}

export function mount(done: Promise<void>, skipped: boolean) {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
  const start = () => {
    useUI.getState().set({ ready: true })
    boot()
  }
  if (skipped) {
    start()
  } else {
    window.addEventListener('ap:handoff', start, { once: true })
    done.then(() => { if (!useUI.getState().ready) start() })
  }
}
