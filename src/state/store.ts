import { create } from 'zustand'
import { site, type Layer } from '../lib/config'
import { detectTier, reducedMotion } from '../lib/env'

export type SectionId = 'hero' | 'manifesto' | 'sewing' | 'drop' | 'fitting' | 'finale' | 'footer'
export const SECTION_IDS: SectionId[] = ['hero', 'manifesto', 'sewing', 'drop', 'fitting', 'finale', 'footer']

export interface SectionWindow {
  id: SectionId
  start: number // px of smoothed scroll where the section's progress is 0
  end: number // px where progress is 1
  p: number // smoothed progress 0..1
}

/**
 * Per-frame runtime values. Mutated by the scroll loop, read by the scene in useFrame.
 * Never mirrored into React state per frame.
 */
export const rt = {
  y: 0, // smoothed scroll px (scrub 0.6 + Lenis)
  rawY: 0,
  vh: window.innerHeight,
  time: 0,
  active: 'hero' as SectionId,
  sections: {} as Record<SectionId, SectionWindow>,
  /** drop room: float beat position (0 = first garment) and per-beat progress */
  dropBeat: 0,
  dropIntro: 0,
  /** time-driven blends (gsap tweens these) */
  boot: 0, // 0..1 chalk lines draw on after preloader
  light: 0, // strip light, flickers on at boot
  inspect: 0, // 0..1 camera fly-in to inspected garment
  fabric: 0, // 0..1 push in to the weave
  rake: { x: 0, y: 0 }, // light rake from cursor / tilt
  spot: [] as number[], // drop-room spot intensities, tweened (hard clicks)
  finaleLights: 1, // multiplier, finale switches spots off back to front
  fitRot: 0, // fitting room drag offset target (radians, clamped ±π)
  fitRotSmoothed: 0,
  swapOut: { top: 1, bottom: 1, outer: 1 } as Record<Layer, number>, // old garment unravel, 1 = gone
  swapIn: { top: 1, bottom: 1, outer: 1 } as Record<Layer, number>, // new garment stitch-on, 1 = on
  swapGlow: { top: 0, bottom: 0, outer: 0 } as Record<Layer, number>,
  /** progress used for visuals: equals p, or quantized stills under reduced motion */
  view: {} as Record<SectionId, number>,
  viewBeat: 0,
  viewIntro: 0,
  stillFade: 0, // reduced motion crossfade
  frames: 0,
  needsRender: true,
}

export const sectionP = (id: SectionId) => rt.sections[id]?.p ?? 0
/** Visual progress (stills under reduced motion). */
export const vp = (id: SectionId) => rt.view[id] ?? 0

interface UIState {
  tier: 'high' | 'low'
  reduced: boolean
  ready: boolean // preloader finished
  section: SectionId
  beat: number // current drop-room garment index
  inspect: { slug: string; fabric: boolean } | null
  colour: Record<string, number>
  look: Record<Layer, string | null>
  previous: Record<Layer, string | null>
  swapping: boolean
  toast: string | null
  set: (p: Partial<UIState>) => void
}

export const useUI = create<UIState>((set) => ({
  tier: detectTier(),
  reduced: reducedMotion,
  ready: false,
  section: 'hero',
  beat: 0,
  inspect: null,
  colour: {},
  look: { ...site.fitting.default },
  previous: { top: null, bottom: null, outer: null },
  swapping: false,
  toast: null,
  set: (p) => set(p),
}))
