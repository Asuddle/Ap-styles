import * as THREE from 'three'
import { site, type Vec3 } from '../lib/config'

/**
 * GREY-BOX pattern pieces. Placeholder outlines until the Marvelous Designer
 * export lands in assets/source/ (phase 2). Units: metres.
 */
export interface PieceDef {
  id: string
  shape: THREE.Shape
  table: Vec3 // centre on the fabric sheet (x, z) at table height
  tableRotZ: number
  hang: Vec3 // where it hangs in the air at the end of the hero
  hangRot: Vec3
  body: Vec3 // where it sits on the invisible body in the sewing line
  bodyRot: Vec3
}

function poly(pts: [number, number][]) {
  const s = new THREE.Shape()
  pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)))
  s.closePath()
  return s
}

const torso = () => poly([[-0.27, -0.33], [0.27, -0.33], [0.27, 0.2], [0.17, 0.33], [0.07, 0.3], [-0.07, 0.3], [-0.17, 0.33], [-0.27, 0.2]])
const sleeve = () => poly([[-0.13, -0.3], [0.13, -0.3], [0.09, 0.3], [-0.09, 0.3]])
const hood = () => {
  const s = new THREE.Shape()
  s.moveTo(-0.2, -0.2)
  s.lineTo(0.2, -0.2)
  s.lineTo(0.2, 0.05)
  s.absarc(0, 0.05, 0.2, 0, Math.PI, false)
  s.closePath()
  return s
}
const pocket = () => poly([[-0.16, -0.09], [0.16, -0.09], [0.12, 0.09], [-0.12, 0.09]])

const H = site.world.hangCenter as Vec3
const shapes: Record<string, () => THREE.Shape> = {
  front: torso, back: torso, 'sleeve-l': sleeve, 'sleeve-r': sleeve, hood, pocket,
}
const layout: Record<string, Omit<PieceDef, 'id' | 'shape'>> = {
  front: { table: [-0.95, 0, 0.0], tableRotZ: 0, hang: [0, H[1] - 0.05, 0.55], hangRot: [0, 0, 0], body: [0, 1.62, 0.15], bodyRot: [0, 0, 0] },
  back: { table: [-0.32, 0, 0.0], tableRotZ: 0, hang: [0, H[1] - 0.05, -0.55], hangRot: [0, Math.PI, 0], body: [0, 1.62, -0.15], bodyRot: [0, Math.PI, 0] },
  'sleeve-l': { table: [0.22, 0, -0.22], tableRotZ: 0.2, hang: [-0.85, H[1], 0], hangRot: [0, 0, -1.1], body: [-0.43, 1.66, 0], bodyRot: [0, 0, -0.5] },
  'sleeve-r': { table: [0.58, 0, -0.22], tableRotZ: -0.2, hang: [0.85, H[1], 0], hangRot: [0, 0, 1.1], body: [0.43, 1.66, 0], bodyRot: [0, 0, 0.5] },
  hood: { table: [1.0, 0, 0.05], tableRotZ: 0, hang: [0, H[1] + 0.68, -0.15], hangRot: [0, 0, 0], body: [0, 2.12, -0.06], bodyRot: [0, 0, 0] },
  pocket: { table: [0.38, 0, 0.36], tableRotZ: 0, hang: [0, H[1] - 0.45, 0.8], hangRot: [0, 0, 0], body: [0, 1.45, 0.17], bodyRot: [0, 0, 0] },
}

export const pieces: PieceDef[] = (site.hero.cutOrder as string[]).map((id) => ({
  id,
  shape: shapes[id](),
  ...layout[id],
}))

export const TABLE_TOP = site.world.table.size[1] as number

/** Outline points of a shape (closed), for chalk + cut lines and the laser path. */
export function outline(shape: THREE.Shape, n = 96) {
  const pts = shape.getSpacedPoints(n)
  return pts.map((p) => new THREE.Vector3(p.x, p.y, 0))
}

/** The logo star as a THREE.Shape (same path as the SVG, 100×100 box, centred, y up). */
export function starShape(scale = 0.01) {
  const s = new THREE.Shape()
  const P = (x: number, y: number) => [(x - 50) * scale, (50 - y) * scale] as const
  s.moveTo(...P(50, 2))
  s.bezierCurveTo(...P(53, 38), ...P(62, 47), ...P(98, 50))
  s.bezierCurveTo(...P(62, 53), ...P(53, 62), ...P(50, 98))
  s.bezierCurveTo(...P(47, 62), ...P(38, 53), ...P(2, 50))
  s.bezierCurveTo(...P(38, 47), ...P(47, 38), ...P(50, 2))
  return s
}
export function starStitchShape(scale = 0.01) {
  const s = new THREE.Shape()
  const P = (x: number, y: number) => [(x - 50) * scale, (50 - y) * scale] as const
  s.moveTo(...P(50, 16))
  s.bezierCurveTo(...P(52.2, 42), ...P(58, 47.8), ...P(84, 50))
  s.bezierCurveTo(...P(58, 52.2), ...P(52.2, 58), ...P(50, 84))
  s.bezierCurveTo(...P(47.8, 58), ...P(42, 52.2), ...P(16, 50))
  s.bezierCurveTo(...P(42, 47.8), ...P(47.8, 42), ...P(50, 16))
  return s
}

/** Seams on the sewing line, in world space (grey-box positions). */
export const seams: Record<string, [Vec3, Vec3][]> = {
  shoulders: [[[-0.07, 1.94, 0], [-0.27, 1.87, 0]], [[0.07, 1.94, 0], [0.27, 1.87, 0]]],
  sides: [[[-0.27, 1.85, 0.0], [-0.27, 1.3, 0.0]], [[0.27, 1.85, 0.0], [0.27, 1.3, 0.0]]],
  sleeves: [[[-0.29, 1.82, 0], [-0.58, 1.42, 0]], [[0.29, 1.82, 0], [0.58, 1.42, 0]]],
  hood: [[[0, 1.94, -0.17], [0, 2.32, -0.06]]],
  cuffs: [[[-0.62, 1.42, -0.08], [-0.52, 1.36, 0.08]], [[0.62, 1.42, -0.08], [0.52, 1.36, 0.08]]],
}

/** Radial gradient texture for fake spotlight pools on the floor. */
let pool: THREE.Texture | null = null
export function poolTexture() {
  if (pool) return pool
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')!
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  grd.addColorStop(0, 'rgba(255,244,224,0.9)')
  grd.addColorStop(0.55, 'rgba(255,244,224,0.35)')
  grd.addColorStop(1, 'rgba(255,244,224,0)')
  g.fillStyle = grd
  g.fillRect(0, 0, 128, 128)
  pool = new THREE.CanvasTexture(c)
  return pool
}
