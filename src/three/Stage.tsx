import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { onTick } from '../motion/scroll'
import { rt, useUI } from '../state/store'
import { maxDpr } from '../lib/env'
import { markSceneReady } from '../boot'
import { CameraRig } from './CameraRig'
import { CuttingTable, PatternPieces, Seams, SewnGarment } from './Factory'
import { DropRoom, FittingRoom, FinaleStar } from './Rooms'

/** Calm sections render on demand; the footer stops rendering. */
function shouldRender() {
  if (rt.active === 'footer') return rt.needsRender
  if (rt.active === 'manifesto') return rt.needsRender
  return true
}

/**
 * The only loop: GSAP's ticker drives Lenis, ScrollTrigger and R3F (frameloop="never" + advance).
 */
function Driver() {
  const advance = useThree((s) => s.advance)
  const gl = useThree((s) => s.gl)
  const size = useThree((s) => s.size)
  useEffect(() => { rt.needsRender = true }, [size])
  useEffect(() => {
    let first = true
    return onTick((time) => {
      if (!shouldRender()) return
      rt.needsRender = false
      advance(time)
      rt.frames++
      if (first) { first = false; markSceneReady() }
    })
  }, [advance])
  useEffect(() => { (window as any).__gl = gl }, [gl])
  return null
}

/** Strip light: flickers on at load, then holds. Rakes across fabric in the close-up. */
function Lights() {
  const key = useRef<THREE.DirectionalLight>(null)
  const amb = useRef<THREE.AmbientLight>(null)
  useFrame(() => {
    if (key.current) {
      key.current.intensity = 2.2 * rt.light * rt.finaleLights
      key.current.position.set(rt.rake.x * 3 * rt.fabric + 0.5, 6, 2 + rt.rake.y * 3 * rt.fabric)
    }
    if (amb.current) amb.current.intensity = 0.35 * rt.finaleLights + 0.05
  })
  return (
    <>
      {/* GREY-BOX lighting. Final: baked lighting + baked shadow texture, no real-time lights. */}
      <ambientLight ref={amb} intensity={0.35} />
      <directionalLight ref={key} position={[0.5, 6, 2]} intensity={2.2} />
    </>
  )
}

function Floor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[8, 0, -6]}>
      <planeGeometry args={[80, 60]} />
      <meshStandardMaterial color="#151515" roughness={1} />
    </mesh>
  )
}

export function Stage() {
  const tier = useUI((s) => s.tier)
  return (
    <div className="canvas-wrap" aria-hidden="true">
      <Canvas
        frameloop="never"
        dpr={[1, maxDpr()]}
        gl={{ antialias: tier === 'high', powerPreference: 'high-performance', alpha: false }}
        camera={{ fov: 25, near: 0.05, far: 60, position: [0, 5, 0] }}
        onCreated={({ gl, scene }) => {
          gl.setClearColor('#0b0b0b')
          scene.fog = new THREE.Fog('#0b0b0b', 7, 26)
        }}
      >
        <Driver />
        <CameraRig />
        <Lights />
        <Floor />
        <CuttingTable />
        <PatternPieces />
        <Seams />
        <SewnGarment />
        <DropRoom />
        <FittingRoom />
        <FinaleStar />
      </Canvas>
    </div>
  )
}
