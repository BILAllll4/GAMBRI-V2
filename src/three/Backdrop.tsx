/**
 * Green stage for the interactive guembri: a lit plaster wall carrying a
 * zellige-inspired eight-point-star lattice, a soft pool of warm light behind
 * the instrument, a floor that catches the shadow and horseshoe-arch line-work.
 */
import { useMemo } from 'react'
import { Line } from '@react-three/drei'
import * as THREE from 'three'
import { starLatticeTexture } from './textures'

function horseshoeArch(w: number, h: number, seg = 72) {
  // horseshoe arch: the circle continues below its spring line before meeting the jambs
  const r = w / 2
  const alpha = 0.5
  const spring = h - r
  const jx = r * Math.cos(alpha)
  const pts: [number, number, number][] = [[-jx, 0, 0]]
  for (let i = 0; i <= seg; i++) {
    const a = Math.PI + alpha - (Math.PI + 2 * alpha) * (i / seg)
    pts.push([r * Math.cos(a), spring + r * Math.sin(a), 0])
  }
  pts.push([jx, 0, 0])
  return pts
}

export function Backdrop() {
  const wallMat = useMemo(() => {
    const lattice = starLatticeTexture('rgba(227,214,187,1)')
    return new THREE.ShaderMaterial({
      uniforms: { map: { value: lattice }, uTop: { value: new THREE.Color('#0f2c22') }, uMid: { value: new THREE.Color('#214a3a') }, uGlow: { value: new THREE.Color('#8f7d58') } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `
        uniform sampler2D map; uniform vec3 uTop, uMid, uGlow; varying vec2 vUv;
        void main(){
          // vertical plaster gradient with a warm pool of light behind the instrument
          vec3 col = mix(uMid, uTop, smoothstep(0.25, 1.0, vUv.y));
          float pool = smoothstep(0.55, 0.0, distance(vUv * vec2(1.6, 1.0), vec2(0.8, 0.36)));
          col = mix(col, uGlow, pool * 0.22);
          float pattern = texture2D(map, vUv * vec2(9.0, 5.0)).a;
          float fade = smoothstep(0.75, 0.15, distance(vUv, vec2(0.5, 0.42)));
          col = mix(col, vec3(0.53, 0.58, 0.49), pattern * (0.045 + pool * 0.04) * fade);
          gl_FragColor = vec4(col, 1.0);
          #include <colorspace_fragment>
        }`,
    })
  }, [])

  const arches = useMemo(() => [0, 1].map((i) => horseshoeArch(2.3 + i * 0.7, 2.4 + i * 0.6)), [])

  return (
    <group>
      {/* floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.32, 0]} receiveShadow>
        <circleGeometry args={[7, 64]} />
        <meshStandardMaterial color="#1a3d30" roughness={0.9} />
      </mesh>
      {/* wall */}
      <mesh position={[0, 1.2, -1.3]} material={wallMat}>
        <planeGeometry args={[9, 5]} />
      </mesh>
      {arches.map((pts, i) => (
        <Line key={i} points={pts} position={[0, -0.32, -1.27 + i * 0.01]} color="#e3d6bb" lineWidth={1} transparent opacity={0.28 - i * 0.1} />
      ))}
    </group>
  )
}
