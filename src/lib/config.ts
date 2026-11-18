import raw from '../../config/site.json'

export type Layer = 'top' | 'bottom' | 'outer'
export interface Colourway { name: string; hex: string }
export interface Garment {
  slug: string
  name: string
  shopifyHandle: string
  layer: Layer
  glb: string
  price: number | null
  colourways: Colourway[]
  fabric: { gsm: number | null; composition: string; fit: string }
  fitsWith: string[]
  fitNotes: Record<string, string>
}
export type Vec3 = [number, number, number]
export interface CamKey {
  at: number
  target: Vec3
  radius: number
  polar: number
  azimuth: number
  fov: number
  ease?: string
}

export const site = raw as any
export const garments = site.garments as Garment[]
export const garmentBySlug = (slug: string | null | undefined) =>
  garments.find((g) => g.slug === slug) ?? null

/** Missing facts stay visible as [PLACEHOLDER] text. Never invent values. */
export function ph(value: unknown, label: string): string {
  if (value === null || value === undefined || value === '' || value === 0) return `[${label}]`
  return String(value)
}

export const fmtPrice = (p: number | null) => (p == null ? '[PRICE]' : `$${p}`)

export function fabricLine(g: Garment) {
  return `${ph(g.fabric.gsm, 'GSM')} GSM · ${ph(g.fabric.composition, 'COMPOSITION')} · ${ph(g.fabric.fit, 'FIT')}`
}

/** Can garment a be worn with garment b? null if fine, else the reason shown to the visitor. */
export function fitReason(a: Garment, b: Garment | null): string | null {
  if (!b || a.slug === b.slug || a.layer === b.layer) return null
  const note = a.fitNotes[b.slug] ?? b.fitNotes[a.slug]
  if (note) return note
  if (!a.fitsWith.includes(b.slug) && !b.fitsWith.includes(a.slug)) return 'Not fitted together yet'
  return null
}

/** World positions derived from config. */
export const world = {
  dropSlot(i: number): Vec3 {
    const d = site.world.dropRoom
    return [d.origin[0] + i * d.spacing, d.garmentY, d.origin[2]]
  },
  fittingPos(): Vec3 {
    const last = world.dropSlot(garments.length - 1)
    return [last[0] + site.world.fittingRoom.offsetFromLast, 0, last[2]]
  },
}
