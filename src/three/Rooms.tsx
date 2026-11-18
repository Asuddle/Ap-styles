import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import gsap from 'gsap'
import { site, garments, garmentBySlug, world, type Layer } from '../lib/config'
import { rt, vp, useUI } from '../state/store'
import { range } from '../motion/tokens'
import { GarmentBox, type GarmentDrive } from './GarmentBox'
import { poolTexture, starShape, starStitchShape } from './geometry'
import { openInspect } from '../sections/inspect'

/** Fake spotlight: emissive cone + baked-looking floor pool. No real-time lights. */
function Spot({ x, z, get }: { x: number; z: number; get: () => number }) {
  const cone = useRef<THREE.MeshBasicMaterial>(null)
  const pool = useRef<THREE.MeshBasicMaterial>(null)
  const tube = useRef<THREE.MeshBasicMaterial>(null)
  const tex = useMemo(() => poolTexture(), [])
  useFrame(() => {
    const k = get()
    if (cone.current) cone.current.opacity = 0.07 * k
    if (pool.current) pool.current.opacity = 0.75 * k
    if (tube.current) tube.current.color.setScalar(0.06 + 0.94 * k)
  })
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 3.6, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 0.06, 16]} />
        <meshBasicMaterial ref={tube} color="#ffffff" toneMapped={false} />
      </mesh>
      <mesh position={[0, 1.8, 0]}>
        <coneGeometry args={[1.0, 3.6, 32, 1, true]} />
        <meshBasicMaterial ref={cone} color="#fff4e0" transparent blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.4, 2.4]} />
        <meshBasicMaterial ref={pool} map={tex} transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  )
}

/** Drop room: one ghost garment per beat, each under its own spot. */
export function DropRoom() {
  const colour = useUI((s) => s.colour)
  const beat = useUI((s) => s.beat)
  const section = useUI((s) => s.section)
  const inspect = useUI((s) => s.inspect)
  const n = garments.length
  if (rt.spot.length !== n + 1) rt.spot = new Array(n + 1).fill(0)

  // spot targets: current beat snaps on (hard click), visited dim to 30%, ahead off
  useEffect(() => {
    const inRoom = section === 'drop' || section === 'fitting'
    const targets = garments.map((_, i) => (!inRoom ? (section === 'finale' || section === 'footer' ? (rt.spot[i] > 0 ? 0.3 : 0) : 0) : i === beat && section === 'drop' ? 1 : i <= beat || section === 'fitting' ? 0.3 : 0))
    targets.push(section === 'fitting' || section === 'finale' || section === 'footer' ? 1 : 0) // fitting plinth
    if (section === 'finale' || section === 'footer') return // finale owns the lights
    targets.forEach((t, i) => gsap.to(rt.spot, { [i]: t, duration: 0.15, ease: 'steps(2)', overwrite: 'auto' }))
  }, [beat, section])

  const drives = useMemo(() => garments.map(() => ({ explode: 0, opacity: 1, glow: 0, light: 0.3 }) as GarmentDrive), [])
  const turn = useRef<THREE.Group[]>([])

  useFrame(() => {
    const vb = rt.viewBeat
    const cur = Math.floor(vb)
    garments.forEach((_, i) => {
      const d = drives[i]
      const near = Math.abs(i - cur) <= 1 || rt.active === 'finale'
      const hiddenBySewn = i === 0 && (rt.active === 'sewing' || (rt.active === 'drop' && rt.viewIntro < 1))
      const inWorld = rt.active === 'drop' || rt.active === 'fitting' || rt.active === 'finale' || rt.active === 'footer'
      d.opacity = near && !hiddenBySewn && inWorld ? 1 : 0
      d.light = Math.max(0.15, rt.spot[i] ?? 0) * rt.finaleLights
      const g = turn.current[i]
      if (g) {
        // hold: slow 15° turn + sway (baked idle loop later)
        const local = i === cur ? range(vb - cur, 0.35, 0.8) : i < cur ? 1 : 0
        const facing = inspect?.slug === garments[i].slug ? rt.inspect : 0
        g.rotation.y = (-0.13 + 0.26 * local) * (1 - facing)
        g.rotation.z = Math.sin(rt.time * 0.8 + i) * 0.012 * (1 - facing)
      }
    })
  })

  return (
    <group>
      {garments.map((g, i) => {
        const pos = world.dropSlot(i)
        const y = g.layer === 'bottom' ? pos[1] + 0.55 : pos[1]
        return (
          <group key={g.slug}>
            <Spot x={pos[0]} z={pos[2]} get={() => (rt.spot[i] ?? 0) * rt.finaleLights} />
            <group position={[pos[0], y, pos[2]]} ref={(el) => { if (el) turn.current[i] = el }}>
              <GarmentBox
                garment={g}
                hex={g.colourways[colour[g.slug] ?? 0]?.hex ?? '#222'}
                drive={() => drives[i]}
                onClick={(e) => {
                  e.stopPropagation()
                  if (rt.active === 'drop' && i === useUI.getState().beat && !useUI.getState().inspect) openInspect(g.slug)
                }}
              />
            </group>
          </group>
        )
      })}
      {/* back wall */}
      <mesh position={[world.dropSlot(0)[0] + ((n - 1) * 3.2) / 2 + 3, 3, world.dropSlot(0)[2] - 2.6]}>
        <planeGeometry args={[n * 3.2 + 22, 6]} />
        <meshStandardMaterial color="#141414" roughness={1} />
      </mesh>
    </group>
  )
}

/** Fitting room: one plinth, a ghost body made of the outfit itself. */
export function FittingRoom() {
  const look = useUI((s) => s.look)
  const previous = useUI((s) => s.previous)
  const colour = useUI((s) => s.colour)
  const pos = world.fittingPos()
  const body = useRef<THREE.Group>(null)
  const dragging = useRef<{ x: number } | null>(null)

  useFrame((_, dt) => {
    const b = body.current
    if (!b) return
    // drag: horizontal only, damped, ±180°
    const k = 1 - Math.exp(-dt * 8)
    rt.fitRotSmoothed += (rt.fitRot - rt.fitRotSmoothed) * k
    const idle = dragging.current ? 0 : Math.sin(rt.time * 0.25) * 0.5
    b.rotation.y = rt.fitRotSmoothed + idle
  })

  const layerDrive = (layer: Layer, which: 'old' | 'new'): (() => GarmentDrive) => {
    const d: GarmentDrive = { explode: 0, opacity: 1, glow: 0, light: 1 }
    return () => {
      const vis = rt.active === 'fitting' || rt.active === 'drop' || rt.active === 'finale'
      if (which === 'old') {
        const k = rt.swapOut[layer]
        d.explode = k
        d.opacity = vis ? 1 - k : 0
      } else {
        const k = rt.swapIn[layer]
        d.explode = 1 - k
        d.opacity = vis ? Math.min(1, k * 1.5) : 0
        d.glow = rt.swapGlow[layer]
      }
      d.light = Math.max(0.2, (rt.spot[garments.length] ?? 0) * rt.finaleLights)
      return d
    }
  }

  const layers: Layer[] = ['bottom', 'top', 'outer']
  const yFor = (l: Layer) => (l === 'bottom' ? 1.45 + 0.02 : 1.45 + 0.02)

  return (
    <group position={pos}>
      <Spot x={0} z={0} get={() => (rt.spot[garments.length] ?? 0) * rt.finaleLights} />
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.65, 0.7, 0.3, 48]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.8} />
      </mesh>
      <group ref={body} position={[0, 0.3, 0]}>
        {layers.map((l) => {
          const cur = garmentBySlug(look[l])
          const old = garmentBySlug(previous[l])
          return (
            <group key={l} position={[0, yFor(l), 0]} scale={l === 'outer' ? 1.04 : 1}>
              {old && old.slug !== cur?.slug && (
                <GarmentBox key={'o' + old.slug} garment={old} hex={old.colourways[colour[old.slug] ?? 0]?.hex ?? '#222'} drive={layerDrive(l, 'old')} />
              )}
              {cur && (
                <GarmentBox
                  key={'n' + cur.slug}
                  garment={cur}
                  hex={cur.colourways[colour[cur.slug] ?? 0]?.hex ?? '#222'}
                  drive={layerDrive(l, 'new')}
                  onDoubleClick={(e) => { e.stopPropagation(); openInspect(cur.slug) }}
                />
              )}
            </group>
          )
        })}
        {/* invisible drag surface around the body */}
        <mesh
          position={[0, 1.2, 0]}
          visible={false}
          onPointerDown={(e) => {
            if (rt.active !== 'fitting') return
            dragging.current = { x: e.clientX }
            ;(e.target as Element)?.setPointerCapture?.(e.pointerId)
            const move = (ev: PointerEvent) => {
              if (!dragging.current) return
              rt.fitRot = Math.max(-Math.PI, Math.min(Math.PI, rt.fitRot + (ev.clientX - dragging.current.x) * 0.008))
              dragging.current.x = ev.clientX
            }
            const up = () => {
              dragging.current = null
              window.removeEventListener('pointermove', move)
              window.removeEventListener('pointerup', up)
            }
            window.addEventListener('pointermove', move)
            window.addEventListener('pointerup', up)
          }}
        >
          <cylinderGeometry args={[0.7, 0.7, 2.4, 12]} />
          <meshBasicMaterial />
        </mesh>
      </group>
    </group>
  )
}

/** Finale: the star mark is sewn on in the dark, ending where the preloader began. */
export function FinaleStar() {
  const pos = world.fittingPos()
  const group = useRef<THREE.Group>(null)
  const fill = useRef<THREE.MeshBasicMaterial>(null)
  const S = site.camera.finaleEnd.star
  const geo = useMemo(() => new THREE.ShapeGeometry(starShape(S.scale), 24), [S.scale])
  const stitch = useMemo(() => {
    const pts = starStitchShape(S.scale).getSpacedPoints(112).map((p) => new THREE.Vector3(p.x, p.y, 0.01))
    const segs: THREE.Vector3[] = []
    for (let i = 0; i < pts.length - 1; i += 2) segs.push(pts[i], pts[i + 1])
    return new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(segs), new THREE.LineBasicMaterial({ color: '#FF5A1F', toneMapped: false }))
  }, [])
  const outlineLine = useMemo(() => {
    const pts = starShape(S.scale).getSpacedPoints(160).map((p) => new THREE.Vector3(p.x, p.y, 0.005))
    return new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: '#e9e6df', transparent: true, toneMapped: false }))
  }, [])
  useFrame(() => {
    const p = vp('finale')
    const on = rt.active === 'finale' || rt.active === 'footer'
    if (group.current) group.current.visible = on && p > 0.29
    const k = range(p, 0.3, 0.6)
    outlineLine.geometry.setDrawRange(0, Math.floor(range(k, 0, 0.4) * 161))
    const total = stitch.geometry.attributes.position.count
    stitch.geometry.setDrawRange(0, Math.floor(range(k, 0.2, 1) * (total / 2)) * 2) // ap.stitch
    if (fill.current) fill.current.opacity = range(p, 0.58, 0.62)
    ;(stitch.material as THREE.LineBasicMaterial).color.set(fill.current && fill.current.opacity > 0.5 ? '#0b0b0b' : '#FF5A1F')
  })
  return (
    <group ref={group} position={[pos[0] + S.offsetX, S.y, pos[2]]} rotation={[0, Math.PI / 2, 0]}>
      <mesh geometry={geo} position={[0, 0, 0]}>
        <meshBasicMaterial ref={fill} color="#FF5A1F" transparent opacity={0} toneMapped={false} />
      </mesh>
      <primitive object={outlineLine} />
      <primitive object={stitch} />
    </group>
  )
}
