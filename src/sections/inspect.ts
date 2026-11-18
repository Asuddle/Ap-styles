import gsap from 'gsap'
import { rt, useUI } from '../state/store'
import { lenis } from '../motion/scroll'
import { isTouch } from '../lib/env'

let returnFocus: HTMLElement | null = null

/** Click to inspect: camera flies in (1.0 s ap.cut), scroll is held so Back returns to the same spot. */
export function openInspect(slug: string) {
  returnFocus = document.activeElement as HTMLElement | null
  lenis?.stop()
  document.documentElement.classList.add('ap-locked')
  useUI.getState().set({ inspect: { slug, fabric: false } })
  gsap.to(rt, { inspect: 1, duration: 1.0, ease: 'ap.cut', overwrite: 'auto' })
}

export function closeInspect() {
  setFabric(false)
  gsap.to(rt, { inspect: 0, duration: 1.0, ease: 'ap.cut', overwrite: 'auto' })
  useUI.getState().set({ inspect: null })
  lenis?.start()
  document.documentElement.classList.remove('ap-locked')
  returnFocus?.focus?.({ preventScroll: true })
}

function onMove(e: PointerEvent) {
  rt.rake.x = (e.clientX / window.innerWidth) * 2 - 1
  rt.rake.y = (e.clientY / window.innerHeight) * 2 - 1
}
function onTilt(e: DeviceOrientationEvent) {
  rt.rake.x = Math.max(-1, Math.min(1, (e.gamma ?? 0) / 30))
  rt.rake.y = Math.max(-1, Math.min(1, ((e.beta ?? 45) - 45) / 30))
}

/** Fabric close-up: push in to the weave; light rakes with the cursor or phone tilt (if permitted). */
export async function setFabric(on: boolean) {
  const s = useUI.getState()
  if (!s.inspect) return
  s.set({ inspect: { ...s.inspect, fabric: on } })
  gsap.to(rt, { fabric: on ? 1 : 0, duration: 1.0, ease: 'ap.cut', overwrite: 'auto' })
  if (on) {
    window.addEventListener('pointermove', onMove)
    if (isTouch) {
      const DOE = window.DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }
      try {
        const ok = DOE?.requestPermission ? (await DOE.requestPermission()) === 'granted' : true
        if (ok) window.addEventListener('deviceorientation', onTilt)
      } catch { /* permission refused: cursor/static light only */ }
    }
  } else {
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('deviceorientation', onTilt)
  }
}
