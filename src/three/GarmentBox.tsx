import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import gsap from 'gsap'
import type { Garment, Vec3 } from '../lib/config'

/**
 * GREY-BOX garment: a few boxes per panel. Replaced by the Marvelous Designer GLB
 * per garment in later phases. Origin = chest centre.
 */
type Part = { pos: Vec3; size: Vec3; rot?: Vec3 }

function partsFor(g: Garment): Part[] {
  const s = g.slug
  if (g.layer === 'bottom') {
    const wide = s.includes('cargo') ? 0.24 : 0.2
    return [
      { pos: [0, -0.45, 0], size: [0.5, 0.18, 0.28] },
      { pos: [-0.13, -0.98, 0], size: [wide, 0.92, 0.24] },
      { pos: [0.13, -0.98, 0], size: [wide, 0.92, 0.24] },
    ]
  }
  if (g.layer === 'outer') {
    const k = s.includes('puffer') ? 1.18 : 1.06
    return [
      { pos: [0, 0, 0], size: [0.6 * k, 0.72, 0.34 * k] },
      { pos: [-0.42 * k, -0.12, 0], size: [0.18 * k, 0.62, 0.18 * k], rot: [0, 0, -0.32] },
      { pos: [0.42 * k, -0.12, 0], size: [0.18 * k, 0.62, 0.18 * k], rot: [0, 0, 0.32] },
      { pos: [0, 0.4, -0.02], size: [0.34, 0.1, 0.3 * k] },
    ]
  }
  const parts: Part[] = [
    { pos: [0, 0, 0], size: [0.54, 0.66, 0.28] },
    { pos: [-0.38, -0.12, 0], size: [0.15, s.includes('tee') ? 0.22 : 0.56, 0.15], rot: [0, 0, -0.38] },
    { pos: [0.38, -0.12, 0], size: [0.15, s.includes('tee') ? 0.22 : 0.56, 0.15], rot: [0, 0, 0.38] },
  ]
  if (s.includes('tee')) {
    parts[1].pos = [-0.33, 0.18, 0]
    parts[2].pos = [0.33, 0.18, 0]
  }
  if (s.includes('hoodie')) parts.push({ pos: [0, 0.45, -0.06], size: [0.32, 0.3, 0.28] })
  return parts
}

export interface GarmentDrive {
  explode: number // 0 = assembled, 1 = panels fully separated
  opacity: number
  glow: number // orange stitch glow 0..1
  light: number // spotlight factor 0..1
}

const ORANGE = new THREE.Color('#FF5A1F')
const tmp = new THREE.Color()

export function GarmentBox({
  garment, hex, drive, position, onClick, onDoubleClick,
}: {
  garment: Garment
  hex: string
  drive: () => GarmentDrive
  position?: Vec3
  onClick?: (e: ThreeEvent<MouseEvent>) => void
  onDoubleClick?: (e: ThreeEvent<MouseEvent>) => void
}) {
  const group = useRef<THREE.Group>(null)
  const parts = useMemo(() => partsFor(garment), [garment])
  const mat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: hex, roughness: 0.92, metalness: 0, transparent: true }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )
  const base = useRef(new THREE.Color(hex))
  // colourway swap = 0.3 s crossfade (texture swap later)
  useEffect(() => {
    const target = new THREE.Color(hex)
    const from = base.current.clone()
    const o = { t: 0 }
    const tw = gsap.to(o, { t: 1, duration: 0.3, ease: 'none', onUpdate: () => base.current.lerpColors(from, target, o.t) })
    return () => { tw.kill() }
  }, [hex])
  useEffect(() => () => mat.dispose(), [mat])

  useFrame(() => {
    const g = group.current
    if (!g) return
    const d = drive()
    g.visible = d.opacity > 0.001
    if (!g.visible) return
    mat.opacity = d.opacity
    mat.depthWrite = d.opacity > 0.98
    tmp.copy(base.current).multiplyScalar(0.25 + 0.75 * d.light)
    mat.color.copy(tmp)
    mat.emissive.copy(ORANGE).multiplyScalar(d.glow * 0.8)
    g.children.forEach((m, i) => {
      const p = parts[i].pos
      const k = 1 + d.explode * 0.9
      m.position.set(p[0] * k + (i ? 0 : 0), p[1] * k, p[2] + d.explode * (i % 2 ? 0.15 : -0.15))
    })
  })

  return (
    <group ref={group} position={position} onClick={onClick} onDoubleClick={onDoubleClick}>
      {parts.map((p, i) => (
        <mesh key={i} position={p.pos} rotation={p.rot ?? [0, 0, 0]} material={mat}>
          <boxGeometry args={p.size} />
        </mesh>
      ))}
    </group>
  )
}
