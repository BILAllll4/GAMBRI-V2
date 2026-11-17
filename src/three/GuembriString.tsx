/**
 * A single gut string whose speaking length vibrates in a vertex shader.
 *
 * Displacement = sum of the first three standing-wave modes between the stop
 * point and the bridge, with exponential decay, an elliptical (lateral +
 * vertical) orbit, and a slight inharmonicity — what a plucked gut string
 * actually does. The visual frequency is scaled down so it reads at 60–120 fps
 * instead of aliasing.
 */
import { useMemo, useRef } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import type { GuembriString as S } from '../data/notes'
import { OPEN_NOTE } from '../data/notes'
import { excitation, useGuembri } from '../store/useGuembri'
import { engine } from '../audio/engine'
import { stringEnds } from './stringPath'

const SEGMENTS = 220
const HIT_MATERIAL = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false })

function orient(mesh: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3) {
  const dir = b.clone().sub(a)
  const len = dir.length()
  dir.normalize()
  // local X = lateral (in the plane of the skin), local Z = roughly vertical
  const lateral = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize()
  const up = new THREE.Vector3().crossVectors(lateral, dir).normalize()
  const m = new THREE.Matrix4().makeBasis(lateral, dir, up)
  mesh.quaternion.setFromRotationMatrix(m)
  mesh.position.copy(a).add(b).multiplyScalar(0.5)
  return len
}

export function GuembriString({
  string,
  material,
  interactive = true,
}: {
  string: S
  material: THREE.MeshPhysicalMaterial
  interactive?: boolean
}) {
  const { nut, bridge, tail } = useMemo(() => stringEnds(string), [string])
  const len = nut.distanceTo(bridge)

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uT0: { value: -100 },
      uAmp: { value: 0 },
      uStop: { value: 0 },
      uLen: { value: len },
      uFreq: { value: 30 },
      uAmpScale: { value: 0.0055 * Math.sqrt(73 / string.openHz) },
      uGlow: { value: 0 },
    }),
    [len, string.openHz],
  )

  // clone the shared gut material and inject the vibration
  const mat = useMemo(() => {
    const m = material.clone()
    m.emissive = new THREE.Color('#b68a4a')
    m.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms)
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
          uniform float uTime, uT0, uAmp, uStop, uLen, uFreq, uAmpScale;
          varying float vVib;`,
        )
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
          float s = 0.5 - position.y / uLen; // 0 at nut (+Y end), 1 at bridge
          float age = max(uTime - uT0, 0.0);
          float env = uAmp * exp(-age * 2.4) * smoothstep(0.0, 0.006, age);
          float u = clamp((s - uStop) / max(1.0 - uStop, 0.001), 0.0, 1.0);
          float w = 6.2831853 * uFreq * age;
          float m1 = sin(3.14159265 * u) * sin(w);
          float m2 = 0.32 * sin(6.2831853 * u) * sin(2.013 * w + 0.7) * exp(-age * 2.0);
          float m3 = 0.14 * sin(9.424778 * u) * sin(3.04 * w + 1.9) * exp(-age * 4.0);
          float d = (m1 + m2 + m3) * env * uAmpScale * step(uStop, s);
          transformed.x += d;
          transformed.z += 0.38 * env * uAmpScale * sin(3.14159265 * u) * cos(w) * step(uStop, s);
          vVib = abs(env) * sin(3.14159265 * u) * step(uStop, s);`,
        )
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>\n uniform float uGlow; varying float vVib;`)
        .replace(
          '#include <emissivemap_fragment>',
          `#include <emissivemap_fragment>
          totalEmissiveRadiance = emissive * (uGlow * 0.35 + vVib * 1.6);`,
        )
    }
    m.customProgramCacheKey = () => 'guembri-string'
    return m
  }, [material, uniforms])

  const geo = useMemo(() => new THREE.CylinderGeometry(string.radius, string.radius, len, 8, SEGMENTS, false), [len, string.radius])
  const tailLen = bridge.distanceTo(tail)
  const tailGeo = useMemo(() => new THREE.CylinderGeometry(string.radius, string.radius, tailLen, 6, 1), [tailLen, string.radius])
  const hitGeo = useMemo(() => new THREE.CylinderGeometry(0.0085, 0.0085, len, 6, 1), [len])

  const ref = useRef<THREE.Mesh>(null)
  const tailRef = useRef<THREE.Mesh>(null)
  const hitRef = useRef<THREE.Mesh>(null)
  const placed = useRef(false)

  useFrame(() => {
    if (!placed.current && ref.current && tailRef.current) {
      // +Y of the cylinder points to the nut
      orient(ref.current, bridge, nut)
      if (hitRef.current) orient(hitRef.current, bridge, nut)
      orient(tailRef.current, tail, bridge)
      placed.current = true
    }
    const ex = excitation[string.id]
    uniforms.uTime.value = performance.now() / 1000
    uniforms.uT0.value = ex.t0
    uniforms.uAmp.value = ex.amp
    uniforms.uStop.value = ex.stop
    uniforms.uFreq.value = 20 + ex.hz * 0.09
    const hovered = useGuembri.getState().hoverString === string.id
    uniforms.uGlow.value += ((hovered ? 1 : 0) - uniforms.uGlow.value) * 0.15
  })

  const onDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    void engine.unlock().then(() => engine.play(OPEN_NOTE[string.id].key, 0.95))
  }

  return (
    <group>
      <mesh ref={ref} geometry={geo} material={mat} castShadow frustumCulled={false} name={`String-${string.id + 1}`} />
      <mesh ref={tailRef} geometry={tailGeo} material={material} castShadow />
      {interactive && (
      <mesh
        ref={hitRef}
        geometry={hitGeo}
        material={HIT_MATERIAL}
        onPointerOver={(e) => {
          e.stopPropagation()
          useGuembri.getState().set({ hoverString: string.id })
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          useGuembri.getState().set({ hoverString: null })
          document.body.style.cursor = ''
        }}
        onPointerDown={onDown}
      />
      )}
    </group>
  )
}
