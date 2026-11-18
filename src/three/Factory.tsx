import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { site, garmentBySlug, world } from '../lib/config'
import { rt, vp, useUI } from '../state/store'
import { cut, lerp, range, settle } from '../motion/tokens'
import { pieces, outline, TABLE_TOP, seams, type PieceDef } from './geometry'
import { GarmentBox } from './GarmentBox'

const ORANGE = new THREE.Color('#FF5A1F')
const COOL = new THREE.Color('#1a1a1a')
const N = 96

const CUT_START = 10 / 160
const CUT_END = 70 / 160
const PER_PIECE = (CUT_END - CUT_START) / pieces.length

/** Strip light + cutting table + fabric sheet. GREY-BOX. */
export function CuttingTable() {
  const light = useRef<THREE.MeshBasicMaterial>(null)
  const [w, h, d] = site.world.table.size as number[]
  useFrame(() => {
    if (light.current) light.current.color.setScalar(0.08 + 0.92 * rt.light)
  })
  return (
    <group>
      <mesh position={[0, h / 2, 0]}>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color="#202224" roughness={0.6} metalness={0.4} />
      </mesh>
      {/* fabric sheet: heavyweight cotton placeholder (KTX2 texture + normal later) */}
      <mesh position={[0, h + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w - 0.3, d - 0.25]} />
        <meshStandardMaterial color="#2c2c2e" roughness={1} />
      </mesh>
      {/* strip light tube */}
      {/* sits behind the top-down frame so it never crosses the camera's view of the table */}
      <mesh position={[0, 3.0, -1.5]}>
        <boxGeometry args={[2.8, 0.03, 0.08]} />
        <meshBasicMaterial ref={light} color="#ffffff" toneMapped={false} />
      </mesh>
    </group>
  )
}

const qTmp = new THREE.Quaternion()
const eTmp = new THREE.Euler()
const vTmp = new THREE.Vector3()

function Piece({ def, index, onHead }: { def: PieceDef; index: number; onHead: (v: THREE.Vector3 | null, k: number) => void }) {
  const group = useRef<THREE.Group>(null)
  const pts = useMemo(() => outline(def.shape, N), [def])
  const geo = useMemo(() => new THREE.ExtrudeGeometry(def.shape, { depth: 0.002, bevelEnabled: false }), [def])
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#6a6864', roughness: 1, transparent: true, side: THREE.DoubleSide }), [])
  const chalk = useMemo(() => {
    const g = new THREE.BufferGeometry().setFromPoints(pts.map((p) => p.clone().setZ(0.004)))
    return new THREE.Line(g, new THREE.LineBasicMaterial({ color: '#e9e6df', transparent: true }))
  }, [pts])
  const cutLine = useMemo(() => {
    const g = new THREE.BufferGeometry().setFromPoints(pts.map((p) => p.clone().setZ(0.005)))
    return new THREE.Line(g, new THREE.LineBasicMaterial({ color: ORANGE, toneMapped: false }))
  }, [pts])

  const qTable = useMemo(() => new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, def.tableRotZ)), [def])
  const qHang = useMemo(() => new THREE.Quaternion().setFromEuler(new THREE.Euler(...def.hangRot)), [def])
  const qBody = useMemo(() => new THREE.Quaternion().setFromEuler(new THREE.Euler(...def.bodyRot)), [def])

  useFrame(() => {
    const g = group.current
    if (!g) return
    const hp = vp('hero')
    const sp = vp('sewing')
    const cs = CUT_START + index * PER_PIECE
    const cutK = range(hp, cs, cs + PER_PIECE)
    const lift = settle(range(hp, 50 / 160 + index * 0.04, 50 / 160 + index * 0.04 + 0.2))
    const fly = cut(range(sp, index * 0.015, 0.25))
    const fade = 1 - range(sp, 0.7, 0.85)
    g.visible = fade > 0.001
    if (!g.visible) return

    // position: table -> hang (lift) -> body (sewing flight)
    const t = def.table
    vTmp.set(t[0], TABLE_TOP + 0.003, t[2])
    g.position.copy(vTmp)
    g.position.lerp(vTmp.set(...def.hang), lift)
    g.position.y += Math.sin(lift * Math.PI) * 0.15
    g.position.lerp(vTmp.set(...def.body), fly)

    // orientation: never slerp the camera, but pieces are objects: slerp is fine here
    g.quaternion.copy(qTable).slerp(qHang, lift).slerp(qBody, fly)
    // flutter (vertex wave later): scrubbed by scroll so calm sections can render on demand
    const flutter = 0.07 * lift * (1 - fly)
    eTmp.set(Math.sin(rt.y * 0.004 + index) * flutter, Math.cos(rt.y * 0.003 + index * 2) * flutter, 0)
    g.quaternion.multiply(qTmp.setFromEuler(eTmp))

    mat.opacity = fade
    ;(chalk.material as THREE.LineBasicMaterial).opacity = (1 - lift) * 0.85
    chalk.geometry.setDrawRange(0, Math.floor(rt.boot * (N + 1)))
    cutLine.geometry.setDrawRange(0, Math.floor(cutK * (N + 1)))
    ;(cutLine.material as THREE.LineBasicMaterial).color.lerpColors(ORANGE, COOL, range(hp, cs + PER_PIECE, cs + PER_PIECE * 2))
    cutLine.visible = fade > 0.5

    if (cutK > 0 && cutK < 1) {
      const p = pts[Math.min(N, Math.floor(cutK * N))]
      onHead(g.localToWorld(vTmp.set(p.x, p.y, 0.01)), cutK)
    }
  })

  return (
    <group ref={group}>
      <mesh geometry={geo} material={mat} />
      <primitive object={chalk} />
      <primitive object={cutLine} />
    </group>
  )
}

/** Hero pattern pieces + laser head + spark trail. */
export function PatternPieces() {
  const tier = useUI((s) => s.tier)
  const head = useRef<THREE.Mesh>(null)
  const headPos = useRef(new THREE.Vector3())
  const headOn = useRef(false)
  const sparks = useMemo(() => {
    const n = 160
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3))
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: '#ffb38a', size: 0.012, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }))
    pts.frustumCulled = false
    return { pts, vel: new Float32Array(n * 3), life: new Float32Array(n), n, next: 0 }
  }, [])

  const onHead = (v: THREE.Vector3 | null) => {
    if (!v) return
    headPos.current.copy(v)
    headOn.current = true
  }

  useFrame((_, dt) => {
    const h = head.current
    if (h) {
      h.visible = headOn.current
      h.position.copy(headPos.current).setY(headPos.current.y + 0.05)
    }
    // sparks: one draw call, off on the low tier
    const s = sparks
    s.pts.visible = tier === 'high'
    if (tier === 'high') {
      const pos = s.pts.geometry.attributes.position as THREE.BufferAttribute
      const a = pos.array as Float32Array
      if (headOn.current) {
        for (let k = 0; k < 4; k++) {
          const i = s.next
          s.next = (s.next + 1) % s.n
          a[i * 3] = headPos.current.x; a[i * 3 + 1] = headPos.current.y; a[i * 3 + 2] = headPos.current.z
          s.vel[i * 3] = (Math.random() - 0.5) * 0.6
          s.vel[i * 3 + 1] = Math.random() * 0.5
          s.vel[i * 3 + 2] = (Math.random() - 0.5) * 0.6
          s.life[i] = 0.35
        }
      }
      const d = Math.min(dt, 0.05)
      for (let i = 0; i < s.n; i++) {
        if (s.life[i] <= 0) { a[i * 3 + 1] = -100; continue }
        s.life[i] -= d
        s.vel[i * 3 + 1] -= 2.5 * d
        a[i * 3] += s.vel[i * 3] * d; a[i * 3 + 1] += s.vel[i * 3 + 1] * d; a[i * 3 + 2] += s.vel[i * 3 + 2] * d
      }
      pos.needsUpdate = true
    }
    headOn.current = false // pieces set it again next frame if a cut is in progress
  }, -1)

  return (
    <group>
      {pieces.map((p, i) => (
        <Piece key={p.id} def={p} index={i} onHead={onHead} />
      ))}
      <mesh ref={head}>
        <boxGeometry args={[0.05, 0.08, 0.05]} />
        <meshBasicMaterial color="#FF5A1F" toneMapped={false} />
      </mesh>
      <primitive object={sparks.pts} />
    </group>
  )
}

/** Seams on the sewing line: an orange stitch line runs along each, one seam group after another. */
export function Seams() {
  const groups = useMemo(() => {
    const ids = (site.sewing.seams as { id: string }[]).map((s) => s.id)
    return ids.map((id) =>
      (seams[id] ?? []).map(([a, b]) => {
        const n = 24
        const pts = Array.from({ length: n + 1 }, (_, i) => new THREE.Vector3(...a).lerp(new THREE.Vector3(...b), i / n))
        const l = new THREE.LineSegments(
          new THREE.BufferGeometry().setFromPoints(pts.flatMap((p, i) => (i < n ? [p, pts[i + 1]] : [])).filter((_, i) => Math.floor(i / 2) % 2 === 0)),
          new THREE.LineBasicMaterial({ color: ORANGE, toneMapped: false, transparent: true }),
        )
        return l
      }),
    )
  }, [])
  const root = useRef<THREE.Group>(null)
  useFrame(() => {
    const sp = vp('sewing')
    if (root.current) root.current.visible = rt.active === 'sewing' && sp > 0.19 && sp < 0.86
    const span = 0.55 / groups.length
    groups.forEach((lines, i) => {
      const k = range(sp, 0.2 + i * span, 0.2 + (i + 1) * span)
      lines.forEach((l) => {
        const total = l.geometry.attributes.position.count
        // ap.stitch: whole stitches only (2 vertices per dash)
        l.geometry.setDrawRange(0, Math.floor(k * (total / 2)) * 2)
        ;(l.material as THREE.LineBasicMaterial).opacity = 1 - range(sp, 0.78, 0.86)
      })
    })
  })
  return <group ref={root}>{groups.flat().map((l, i) => <primitive key={i} object={l} />)}</group>
}

/** The sewn ghost hoodie: appears as the panels relax, then floats back into the drop room. */
export function SewnGarment() {
  const g = garmentBySlug(site.hero.garment)!
  const colour = useUI((s) => s.colour[g.slug] ?? 0)
  const wrap = useRef<THREE.Group>(null)
  const from = useMemo(() => new THREE.Vector3(0, 1.62, 0), [])
  const to = useMemo(() => new THREE.Vector3(...world.dropSlot(0)), [])
  const drive = useMemo(() => ({ explode: 0, opacity: 0, glow: 0, light: 1 }), [])
  useFrame(() => {
    const sp = vp('sewing')
    const sec = rt.active
    const intro = sec === 'drop' ? rt.viewIntro : 0
    const inPlay = sec === 'sewing' || (sec === 'drop' && intro < 1)
    drive.opacity = inPlay ? (sec === 'sewing' ? range(sp, 0.7, 0.85) : 1) : 0
    drive.explode = sec === 'sewing' ? 0.12 * (1 - range(sp, 0.7, 0.85)) : 0
    if (wrap.current) {
      wrap.current.position.lerpVectors(from, to, cut(intro))
      // settle: hem drops a touch as the panels relax (baked cloth clip later)
      wrap.current.scale.y = sec === 'sewing' ? lerp(1.04, 1, range(sp, 0.7, 0.85)) : 1
    }
  })
  return (
    <group ref={wrap}>
      <GarmentBox garment={g} hex={g.colourways[colour]?.hex ?? '#222'} drive={() => drive} />
    </group>
  )
}
