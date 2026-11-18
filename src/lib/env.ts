const q = new URLSearchParams(location.search)

export const flags = {
  debug: q.has('debug'),
  qa: q.has('qa'),
  forceTier: (q.get('tier') as 'high' | 'low' | null) ?? null,
}

export const reducedMotion =
  q.has('reduced') || window.matchMedia('(prefers-reduced-motion: reduce)').matches

export const isTouch = window.matchMedia('(pointer: coarse)').matches

export const isPortrait = () => window.innerHeight > window.innerWidth
export const isMobileLayout = () => window.innerWidth < 768

/** Rough device tier. Low tier = touch devices with few cores or little memory. `?tier=low` forces it. */
export function detectTier(): 'high' | 'low' {
  if (flags.forceTier) return flags.forceTier
  const nav = navigator as Navigator & { deviceMemory?: number }
  const cores = nav.hardwareConcurrency ?? 4
  const mem = nav.deviceMemory ?? 4
  if (isTouch && (cores <= 6 || mem <= 4)) return 'low'
  return 'high'
}

/** DPR clamp: 1.25 on phones, 2 elsewhere. */
export const maxDpr = () => (isTouch ? 1.25 : 2)

export const ss = {
  get(k: string) {
    try { return sessionStorage.getItem(k) } catch { return null }
  },
  set(k: string, v: string) {
    try { sessionStorage.setItem(k, v) } catch { /* private mode / blocked storage */ }
  },
}
