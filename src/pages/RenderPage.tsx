/**
 * DEV ONLY (/render/:shot): frames the 3D models for still renders.
 * `npm run renders` screenshots these into public/images/renders/.
 */
import { Suspense, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Canvas, useThree } from '@react-three/fiber'
import { ContactShadows, Environment, Lightformer } from '@react-three/drei'
import { EffectComposer, Bloom, ToneMapping, Vignette } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import * as THREE from 'three'
import { GuembriGLB } from '../three/GuembriGLB'
import { Qraqeb } from '../three/Qraqeb'
import { excitation } from '../store/useGuembri'

type Shot = { model: 'guembri' | 'qraqeb'; pos: [number, number, number]; look: [number, number, number]; fov: number; bg: string; floor: number }
const SHOTS: Record<string, Shot> = {
  'guembri-hero': { model: 'guembri', pos: [0.02, 0.85, 1.85], look: [0.0, -0.06, 0], fov: 34, bg: '#1d3024', floor: -0.2 },
  'guembri-strings': { model: 'guembri', pos: [-0.62, 0.16, 0.24], look: [-0.15, 0.02, 0], fov: 30, bg: '#17251c', floor: -0.2 },
  'guembri-sersera': { model: 'guembri', pos: [0.86, 0.24, 0.3], look: [0.58, -0.01, 0], fov: 30, bg: '#17251c', floor: -0.2 },
  qraqeb: { model: 'qraqeb', pos: [0.05, 0.4, 0.3], look: [0, -0.01, 0], fov: 34, bg: '#1d3024', floor: -0.08 },
  'qraqeb-detail': { model: 'qraqeb', pos: [0.2, 0.2, 0.16], look: [0.07, 0, 0], fov: 30, bg: '#17251c', floor: -0.08 },
}

function Cam({ shot }: { shot: Shot }) {
  const { camera } = useThree()
  useEffect(() => {
    camera.position.set(...shot.pos)
    camera.lookAt(...shot.look)
    ;(camera as THREE.PerspectiveCamera).fov = shot.fov
    camera.updateProjectionMatrix()
    // keep strings still for renders
    for (const k of [0, 1, 2] as const) excitation[k].amp = 0
  }, [camera, shot])
  return null
}

export default function RenderPage() {
  const { shot = 'guembri-hero' } = useParams()
  const s = SHOTS[shot] ?? SHOTS['guembri-hero']
  return (
    <div className="fixed inset-0 z-[100]" style={{ background: `radial-gradient(circle at 50% 42%, #35523f 0%, ${s.bg} 70%)` }} data-render-ready>
      <Canvas shadows dpr={2} gl={{ antialias: true, preserveDrawingBuffer: true }} onCreated={({ gl }) => (gl.toneMapping = THREE.NoToneMapping)}>
        <Cam shot={s} />
        <Suspense fallback={null}>
          <Environment resolution={256} frames={1}>
            <Lightformer form="rect" intensity={2.2} color="#f6e6c8" position={[-2, 3, 2]} scale={[3, 1.5, 1]} target={[0, 0, 0]} />
            <Lightformer form="rect" intensity={0.9} color="#87947c" position={[3, 1, -2]} scale={[2, 2, 1]} target={[0, 0, 0]} />
          </Environment>
          <spotLight position={[-0.9, 2, 1.2]} angle={0.5} penumbra={0.8} intensity={22} color="#fbe6c2" castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0002} />
          <hemisphereLight args={['#f1ebdd', '#17251c', 0.3]} />
          {s.model === 'guembri' ? <GuembriGLB /> : <Qraqeb pairs={1} />}
          <ContactShadows position={[0, s.floor, 0]} opacity={0.6} scale={s.model === 'guembri' ? 3 : 1} blur={2.5} far={0.6} color="#0c140f" />
        </Suspense>
        <EffectComposer enableNormalPass={false}>
          <Bloom mipmapBlur luminanceThreshold={0.9} intensity={0.3} />
          <Vignette offset={0.3} darkness={0.55} />
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        </EffectComposer>
      </Canvas>
    </div>
  )
}
