import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { site, garmentBySlug, fmtPrice, fabricLine } from '../lib/config'
import { useUI } from '../state/store'
import { closeInspect, setFabric } from './inspect'
import { dropIsLive } from './DropRoom'
import { RadioRow } from '../components/RadioRow'

export function InspectPanel() {
  const inspect = useUI((s) => s.inspect)
  const colour = useUI((s) => s.colour)
  const panel = useRef<HTMLDivElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const [size, setSize] = useState<string | null>(null)
  const g = garmentBySlug(inspect?.slug)

  useEffect(() => {
    const el = panel.current
    if (!el) return
    if (inspect) {
      gsap.fromTo(el, { xPercent: 100, autoAlpha: 1 }, { xPercent: 0, duration: 0.7, ease: 'ap.settle', overwrite: 'auto' })
      heading.current?.focus({ preventScroll: true })
    } else {
      gsap.to(el, { xPercent: 100, duration: 0.3, ease: 'ap.cut', overwrite: 'auto', onComplete: () => { gsap.set(el, { autoAlpha: 0 }) } })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inspect?.slug, !!inspect])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && useUI.getState().inspect) closeInspect() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div ref={panel} className="inspect-panel" role="dialog" aria-modal="false" aria-labelledby="inspect-title" style={{ visibility: 'hidden' }}>
      {g && (
        <>
          <button className="btn btn-ghost back" onClick={closeInspect}>← Back <span className="mono kbd">ESC</span></button>
          <h3 id="inspect-title" ref={heading} tabIndex={-1} className="display card-name">{g.name}</h3>
          <p className="mono">{fmtPrice(g.price)}</p>
          <p className="mono label">{fabricLine(g)}</p>
          <RadioRow
            label="Colourway"
            options={g.colourways.map((c, i) => ({ value: String(i), label: c.name, swatch: c.hex }))}
            value={String(colour[g.slug] ?? 0)}
            onChange={(v) => useUI.getState().set({ colour: { ...useUI.getState().colour, [g.slug]: Number(v) } })}
          />
          <RadioRow
            label="Size"
            options={(site.fitting.sizes as string[]).map((s) => ({ value: s, label: s }))}
            value={size}
            onChange={setSize}
          />
          <div className="card-actions">
            <button className="btn btn-ghost" aria-pressed={!!inspect?.fabric} onClick={() => setFabric(!inspect?.fabric)}>
              Fabric
            </button>
            <button
              className="btn"
              onClick={() => useUI.getState().set({ toast: dropIsLive() ? 'Demo: the bag is not connected yet.' : 'Demo: notifications are not connected yet.' })}
            >
              {dropIsLive() ? 'Add to bag' : 'Notify me'}
            </button>
          </div>
          <p className="mono label muted">[PLACEHOLDER] Fabric close-up: real weave texture arrives with the garment scans.</p>
        </>
      )}
    </div>
  )
}
