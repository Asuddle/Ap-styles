import { useRef } from 'react'
import gsap from 'gsap'
import { garments, garmentBySlug, fitReason, fmtPrice, type Layer } from '../lib/config'
import { rt, useUI } from '../state/store'
import { useTimings } from '../motion/scroll'
import { apStitch } from '../motion/tokens'
import { reducedMotion, ss } from '../lib/env'
import { useStage } from './useStage'
import { RadioRow, type Opt } from '../components/RadioRow'

const LAYERS: { id: Layer; label: string }[] = [
  { id: 'top', label: 'Top' },
  { id: 'bottom', label: 'Bottom' },
  { id: 'outer', label: 'Outer' },
]
const NONE = '__none'

/** Fallback to a 0.3 s crossfade if a swap ran under 50 fps on this device (remembered for the session). */
const useFade = () => reducedMotion || ss.get('ap-swap-fade') === '1' || new URLSearchParams(location.search).get('swap') === 'fade'

let swapTl: gsap.core.Timeline | null = null
export function swapLayer(layer: Layer, slug: string | null) {
  const st = useUI.getState()
  if (st.look[layer] === slug) return
  swapTl?.progress(1)
  st.set({ previous: { ...st.previous, [layer]: st.look[layer] }, look: { ...st.look, [layer]: slug } })
  rt.swapOut[layer] = 0
  rt.swapIn[layer] = 0
  rt.swapGlow[layer] = 0
  const f0 = rt.frames
  const tl = gsap.timeline({
    onComplete: () => {
      const fps = (rt.frames - f0) / tl.duration()
      if (!useFade() && fps < 50 && st.tier === 'low') ss.set('ap-swap-fade', '1')
    },
  })
  if (useFade()) {
    tl.to(rt.swapOut, { [layer]: 1, duration: 0.3, ease: 'none' }, 0)
    tl.to(rt.swapIn, { [layer]: 1, duration: 0.3, ease: 'none' }, 0)
  } else {
    // 0–0.45 s old garment unravels along its seams (ap.cut)
    tl.to(rt.swapOut, { [layer]: 1, duration: 0.45, ease: 'ap.cut' }, 0)
    // 0.3–0.95 s new garment stitches on (ap.stitch)
    tl.set(rt.swapGlow, { [layer]: 1 }, 0.3)
    tl.to(rt.swapIn, { [layer]: 1, duration: 0.65, ease: apStitch(10) }, 0.3)
    // 0.8–1.1 s settle (baked clip later), stitch glow cools to the fabric colour
    tl.to(rt.swapGlow, { [layer]: 0, duration: 0.3, ease: 'none' }, 0.8)
  }
  swapTl = tl
}

export function FittingRoomSection() {
  const stage = useRef<HTMLDivElement>(null)
  const look = useUI((s) => s.look)
  const L = useTimings().fitting
  useStage('fitting', stage, 0.4)

  const optionsFor = (layer: Layer): Opt[] => {
    const others = LAYERS.filter((l) => l.id !== layer).map((l) => garmentBySlug(look[l.id]))
    const opts: Opt[] = garments
      .filter((g) => g.layer === layer)
      .map((g) => {
        const reason = others.map((o) => fitReason(g, o)).find(Boolean) ?? null
        return { value: g.slug, label: g.name, sub: fmtPrice(g.price), disabled: reason }
      })
    if (layer === 'outer') opts.unshift({ value: NONE, label: 'None' })
    return opts
  }

  const items = LAYERS.map((l) => garmentBySlug(look[l.id])).filter(Boolean)
  const anyMissing = items.some((g) => g!.price == null)
  const total = anyMissing ? '[PRICE]' : `$${items.reduce((s, g) => s + (g!.price ?? 0), 0)}`

  return (
    <section data-section="fitting" data-len={L} style={{ height: `${L}vh` }} aria-labelledby="fitting-title">
      <div ref={stage} className="stage fitting-stage">
        <div className="fitting-head">
          <h2 id="fitting-title" className="display fitting-title">Fitting room</h2>
          <p className="mono label">Build a look. Drag the body to turn it. Double-click a garment for details.</p>
        </div>
        <div className="rotate-ctrls">
          <button className="btn btn-ghost icon" aria-label="Turn the look left" onClick={() => { rt.fitRot = Math.max(-Math.PI, rt.fitRot - 0.6) }}>⟲</button>
          <button className="btn btn-ghost icon" aria-label="Turn the look right" onClick={() => { rt.fitRot = Math.min(Math.PI, rt.fitRot + 0.6) }}>⟳</button>
        </div>
        <div className="fitting-ui">
          {LAYERS.map((l) => (
            <RadioRow
              key={l.id}
              label={l.label}
              className="layer-row"
              options={optionsFor(l.id)}
              value={look[l.id] ?? NONE}
              onChange={(v) => swapLayer(l.id, v === NONE ? null : v)}
            />
          ))}
          <div className="look-total">
            <p className="mono label">
              Look total <span className="total">{total}</span>
            </p>
            <button className="btn" onClick={() => useUI.getState().set({ toast: 'Demo: the bag is not connected yet.' })}>
              Add this look to bag
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
