import gsap from 'gsap'
import { CustomEase } from 'gsap/CustomEase'

gsap.registerPlugin(CustomEase)

/**
 * AP-Star motion tokens. No bounce, elastic or back easing anywhere on the site.
 *  ap.cut    cubic-bezier(0.7, 0, 0.2, 1)   laser travel, camera cuts, UI swaps
 *  ap.settle cubic-bezier(0.16, 1, 0.3, 1)  text reveals, cards, pieces landing
 *  ap.stitch steps(n) over the seam length  stitch dashes appearing one by one
 *  ap.drape  baked cloth animation only, never a tween (grey-box: none)
 */
CustomEase.create('ap.cut', 'M0,0 C0.7,0 0.2,1 1,1')
CustomEase.create('ap.settle', 'M0,0 C0.16,1 0.3,1 1,1')

export const apStitch = (n: number) => `steps(${Math.max(1, Math.round(n))})`

export const CSS_EASE = {
  cut: 'cubic-bezier(0.7, 0, 0.2, 1)',
  settle: 'cubic-bezier(0.16, 1, 0.3, 1)',
}

export const DUR = { micro: 0.3, line: 0.7, headline: 0.9, camera: 1.1 }
export const STAGGER = { line: 0.05, word: 0.03 }

/** Ease lookup for config strings: "ap.cut", "ap.settle", "ap.stitch:12", "none". */
export function easeFn(name?: string): (t: number) => number {
  if (!name || name === 'none' || name === 'linear') return (t) => t
  if (name.startsWith('ap.stitch')) {
    const n = Number(name.split(':')[1] ?? 12)
    return (t) => Math.floor(t * n) / n
  }
  return gsap.parseEase(name) as (t: number) => number
}
export const cut = easeFn('ap.cut')
export const settle = easeFn('ap.settle')
export const stitch = (t: number, n: number) => Math.floor(t * n) / n

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
/** Map p from [a,b] to [0,1], clamped. */
export const range = (p: number, a: number, b: number) => clamp01((p - a) / (b - a))
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
