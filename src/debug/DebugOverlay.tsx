import { useEffect, useRef } from 'react'
import type * as THREE from 'three'
import { onTick } from '../motion/scroll'
import { rt, useUI } from '../state/store'

/** ?debug overlay: fps, DPR, draw calls, triangles, current section, progress. */
export function DebugOverlay() {
  const el = useRef<HTMLPreElement>(null)
  useEffect(() => {
    let last = performance.now()
    let f0 = rt.frames
    let fps = 0
    let minFps = Infinity
    return onTick(() => {
      const now = performance.now()
      if (now - last < 500) return
      fps = ((rt.frames - f0) * 1000) / (now - last)
      if (rt.frames > 30 && rt.active !== 'manifesto' && rt.active !== 'footer') minFps = Math.min(minFps, fps)
      f0 = rt.frames
      last = now
      const gl = (window as any).__gl as THREE.WebGLRenderer | undefined
      const info = gl?.info.render
      const s = rt.sections[rt.active]
      const ui = useUI.getState()
      if (el.current)
        el.current.textContent = [
          `fps      ${fps.toFixed(0)}  (min ${minFps === Infinity ? '-' : minFps.toFixed(0)})`,
          `dpr      ${gl ? gl.getPixelRatio().toFixed(2) : '-'}  (device ${devicePixelRatio})`,
          `calls    ${info?.calls ?? '-'}`,
          `tris     ${info?.triangles ?? '-'}`,
          `section  ${rt.active}`,
          `progress ${(s?.p ?? 0).toFixed(3)}${rt.active === 'drop' ? `  beat ${rt.dropBeat.toFixed(2)}` : ''}`,
          `scroll   ${(rt.y / rt.vh * 100).toFixed(0)}vh`,
          `tier     ${ui.tier}${ui.reduced ? ' · reduced' : ''}`,
        ].join('\n')
    })
  }, [])
  return <pre ref={el} className="debug" aria-hidden="true" />
}
