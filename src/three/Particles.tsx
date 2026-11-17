/**
 * Dust motes drifting through the light. A single Points draw call; motion is
 * computed in the vertex shader and pushed by the live audio level.
 */
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { engine } from '../audio/engine'

export function Particles({ count = 700, reduced = false }: { count?: number; reduced?: boolean }) {
  const mat = useRef<THREE.ShaderMaterial>(null)
  const level = useRef({ low: 0, mid: 0, high: 0, rms: 0 })

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const p = new Float32Array(count * 3)
    const r = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      p[i * 3] = (Math.random() - 0.5) * 3.2
      p[i * 3 + 1] = Math.random() * 1.4 - 0.35
      p[i * 3 + 2] = (Math.random() - 0.5) * 2.2
      r[i] = Math.random()
    }
    g.setAttribute('position', new THREE.BufferAttribute(p, 3))
    g.setAttribute('aRand', new THREE.BufferAttribute(r, 1))
    return g
  }, [count])

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uLow: { value: 0 },
      uMid: { value: 0 },
      uHigh: { value: 0 },
      uPx: { value: Math.min(window.devicePixelRatio, 2) },
      uMotion: { value: reduced ? 0.15 : 1 },
    }),
    [reduced],
  )

  useFrame((_, dt) => {
    const l = engine.levels()
    const k = 1 - Math.exp(-dt * 10)
    level.current.low += (l.low - level.current.low) * k
    level.current.mid += (l.mid - level.current.mid) * k
    level.current.high += (l.high - level.current.high) * k
    uniforms.uTime.value += dt
    uniforms.uLow.value = level.current.low
    uniforms.uMid.value = level.current.mid
    uniforms.uHigh.value = level.current.high
  })

  return (
    <points geometry={geo} frustumCulled={false}>
      <shaderMaterial
        ref={mat}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        vertexShader={/* glsl */ `
          uniform float uTime, uLow, uMid, uHigh, uPx, uMotion;
          attribute float aRand;
          varying float vA;
          void main() {
            vec3 p = position;
            float t = uTime * uMotion;
            p.x += sin(t * 0.07 + aRand * 40.0) * 0.12;
            p.y += mod(t * (0.008 + aRand * 0.012) + aRand, 1.0) * 0.25;
            p.z += cos(t * 0.05 + aRand * 25.0) * 0.1;
            // sound pushes motes away from the instrument
            vec3 dir = normalize(p - vec3(0.0, 0.02, 0.0) + 0.0001);
            float push = uLow * 0.18 + uMid * 0.1;
            p += dir * push * (0.4 + aRand);
            p.y += sin(t * 3.0 + aRand * 30.0) * uHigh * 0.04;
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            gl_Position = projectionMatrix * mv;
            float size = (1.2 + aRand * 2.4) * (1.0 + uMid * 1.8);
            gl_PointSize = size * uPx * (1.6 / -mv.z);
            vA = (0.25 + aRand * 0.55) * (0.65 + uMid * 1.4 + uHigh * 0.8);
          }`}
        fragmentShader={/* glsl */ `
          varying float vA;
          void main() {
            float d = length(gl_PointCoord - 0.5);
            float a = smoothstep(0.5, 0.0, d) * vA;
            gl_FragColor = vec4(0.93, 0.78, 0.55, a * 0.55);
          }`}
      />
    </points>
  )
}
