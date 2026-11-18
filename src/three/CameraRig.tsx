import { useMemo } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { site, garments, garmentBySlug, world, type CamKey, type Vec3 } from '../lib/config'
import { rt, vp, useUI } from '../state/store'
import { cut, easeFn, lerp, range } from '../motion/tokens'
import { isPortrait } from '../lib/env'

/**
 * Spherical camera rig around a target. Animates radius, polar, azimuth and fov;
 * never slerps orientations. The visitor never steers it: scroll and clicks do.
 */
interface Pose { target: THREE.Vector3; radius: number; polar: number; azimuth: number; fov: number }
const mk = (): Pose => ({ target: new THREE.Vector3(), radius: 4, polar: 1.2, azimuth: 0, fov: 40 })
function mix(out: Pose, a: Pose, b: Pose, t: number) {
  out.target.lerpVectors(a.target, b.target, t)
  out.radius = lerp(a.radius, b.radius, t)
  out.polar = lerp(a.polar, b.polar, t)
  out.azimuth = lerp(a.azimuth, b.azimuth, t)
  out.fov = lerp(a.fov, b.fov, t)
  return out
}
function setPose(out: Pose, target: Vec3, radius: number, polar: number, azimuth: number, fov: number) {
  out.target.set(...target)
  out.radius = radius; out.polar = polar; out.azimuth = azimuth; out.fov = fov
  return out
}
function sample(out: Pose, keys: CamKey[], p: number) {
  let i = 0
  while (i < keys.length - 2 && p > keys[i + 1].at) i++
  const a = keys[i]
  const b = keys[Math.min(i + 1, keys.length - 1)]
  const t = b.at === a.at ? 1 : easeFn(b.ease)(range(p, a.at, b.at))
  out.target.set(lerp(a.target[0], b.target[0], t), lerp(a.target[1], b.target[1], t), lerp(a.target[2], b.target[2], t))
  out.radius = lerp(a.radius, b.radius, t)
  out.polar = lerp(a.polar, b.polar, t)
  out.azimuth = lerp(a.azimuth, b.azimuth, t)
  out.fov = lerp(a.fov, b.fov, t)
  return out
}

const keysFor = (id: 'hero' | 'manifesto' | 'sewing') =>
  (site.camera[id][isPortrait() ? 'portrait' : 'landscape'] as CamKey[])

export function CameraRig() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const P = useMemo(() => ({ a: mk(), b: mk(), c: mk(), out: mk() }), [])
  const sph = useMemo(() => new THREE.Spherical(), [])
  const off = useMemo(() => new THREE.Vector3(), [])

  const slotPose = (out: Pose, i: number) => {
    const c = site.camera.drop[isPortrait() ? 'portrait' : 'landscape']
    const s = world.dropSlot(i)
    const g = garments[i]
    const y = g?.layer === 'bottom' ? s[1] + 0.05 : s[1]
    return setPose(out, [s[0] + (c.offsetX ?? 0), y + (c.offsetY ?? 0), s[2]], c.radius, c.polar, c.azimuth, c.fov)
  }
  const fittingPose = (out: Pose) => {
    const c = site.camera.fitting[isPortrait() ? 'portrait' : 'landscape']
    const f = world.fittingPos()
    return setPose(out, [f[0], c.targetY, f[2]], c.radius, c.polar, c.azimuth, c.fov)
  }
  const finalePose = (out: Pose, pull: number, fov: number) => {
    fittingPose(P.c)
    const f = world.fittingPos()
    const e = site.camera.finaleEnd
    const c = e[isPortrait() ? 'portrait' : 'landscape']
    // pull back into the dark, looking down the row from the far end; star sits above the countdown
    setPose(out, [f[0] + e.star.offsetX, e.star.y - c.targetDrop, f[2]], c.radius, c.polar, Math.PI / 2, fov)
    return mix(out, P.c, out, pull)
  }

  useFrame(() => {
    const sec = rt.active
    const o = P.out
    if (sec === 'hero') sample(o, keysFor('hero'), vp('hero'))
    else if (sec === 'manifesto') sample(o, keysFor('manifesto'), vp('manifesto'))
    else if (sec === 'sewing') sample(o, keysFor('sewing'), vp('sewing'))
    else if (sec === 'drop') {
      const intro = rt.viewIntro
      if (intro < 1) {
        const k = keysFor('sewing')
        sample(P.a, k, 1)
        slotPose(P.b, 0)
        mix(o, P.a, P.b, cut(intro))
      } else {
        const vb = Math.min(rt.viewBeat, garments.length - 0.001)
        const i = Math.floor(vb)
        const local = vb - i
        slotPose(P.a, Math.max(0, i - 1))
        slotPose(P.b, i)
        mix(o, P.a, P.b, i === 0 ? 1 : cut(range(local, 0, 0.35)))
      }
    } else if (sec === 'fitting') {
      slotPose(P.a, garments.length - 1)
      fittingPose(P.b)
      mix(o, P.a, P.b, cut(range(vp('fitting'), 0, 0.2)))
    } else {
      const keys = site.camera.finale[isPortrait() ? 'portrait' : 'landscape'] as { at: number; pull: number; fov: number; ease?: string }[]
      const p = sec === 'footer' ? 1 : vp('finale')
      let j = 0
      while (j < keys.length - 2 && p > keys[j + 1].at) j++
      const a = keys[j], b = keys[j + 1]
      const t = easeFn(b.ease)(range(p, a.at, b.at))
      finalePose(o, lerp(a.pull, b.pull, t), lerp(a.fov, b.fov, t))
    }

    // inspect / fabric close-up blend (time-based, 1.0 s ap.cut)
    const ins = useUI.getState().inspect
    if (rt.inspect > 0.001 && ins) {
      const g = garmentBySlug(ins.slug)
      const idx = garments.findIndex((x) => x.slug === ins.slug)
      const portrait = isPortrait()
      const c = site.camera.drop[portrait ? 'inspectPortrait' : 'inspect']
      const inFitting = sec === 'fitting'
      if (!inFitting && g) {
        const s = world.dropSlot(idx)
        const y = g.layer === 'bottom' ? s[1] + 0.05 : s[1]
        setPose(P.c, [s[0] + (c.offsetX ?? 0), y + (c.offsetY ?? 0), s[2]], c.radius, c.polar, 0, c.fov)
        mix(o, o, P.c, rt.inspect)
        if (rt.fabric > 0.001) {
          const f = site.camera.drop.fabric
          setPose(P.a, [s[0], y + f.offsetY, s[2]], f.radius, f.polar, 0, f.fov)
          mix(o, o, P.a, rt.fabric)
        }
      }
    }

    sph.set(o.radius, o.polar, o.azimuth)
    off.setFromSpherical(sph)
    camera.position.copy(o.target).add(off)
    camera.lookAt(o.target)
    if (Math.abs(camera.fov - o.fov) > 1e-4) {
      camera.fov = o.fov
      camera.updateProjectionMatrix()
    }
  }, -2)
  return null
}
