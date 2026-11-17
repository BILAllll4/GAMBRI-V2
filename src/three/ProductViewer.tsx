/** Interactive product viewer for items that have a 3D model (guembri, qraqeb). */
import { Suspense, useEffect, useRef } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { ContactShadows, Environment, Lightformer, OrbitControls } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import * as THREE from 'three'
import gsap from 'gsap'
import type { GuembriFinish } from './Guembri'
import { GuembriGLB } from './GuembriGLB'
import { Qraqeb } from './Qraqeb'

export type ViewerModel = { kind: 'guembri'; finish: GuembriFinish } | { kind: 'qraqeb'; pairs: 1 | 2 }

const FRAMING = {
  guembri: { pos: new THREE.Vector3(0.15, 0.7, 1.55), target: new THREE.Vector3(0.0, -0.05, 0), min: 0.25, max: 3, floor: -0.2 },
  qraqeb: { pos: new THREE.Vector3(0.1, 0.32, 0.5), target: new THREE.Vector3(0.0, 0.0, 0), min: 0.12, max: 1.2, floor: -0.08 },
}

function Rig({ kind, resetNonce }: { kind: ViewerModel['kind']; resetNonce: number }) {
  const { camera } = useThree()
  const controls = useThree((s) => s.controls) as unknown as OrbitControlsImpl | null
  const first = useRef(true)
  useEffect(() => {
    if (!controls) return
    const f = FRAMING[kind]
    if (first.current) {
      camera.position.copy(f.pos)
      controls.target.copy(f.target)
      controls.update()
      first.current = false
      return
    }
    gsap.to(camera.position, { x: f.pos.x, y: f.pos.y, z: f.pos.z, duration: 1, ease: 'power2.inOut', onUpdate: () => controls.update() })
    gsap.to(controls.target, { x: f.target.x, y: f.target.y, z: f.target.z, duration: 1, ease: 'power2.inOut' })
  }, [kind, resetNonce, controls, camera])
  return null
}

export default function ProductViewer({ model, resetNonce = 0, autoRotate = true }: { model: ViewerModel; resetNonce?: number; autoRotate?: boolean }) {
  const f = FRAMING[model.kind]
  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      camera={{ fov: 32, near: 0.01, far: 20, position: f.pos.toArray() }}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
      onCreated={({ scene }) => {
        scene.background = null
      }}
    >
      <Suspense fallback={null}>
        <Environment resolution={256} frames={1}>
          <Lightformer form="rect" intensity={2.4} color="#f6e6c8" position={[-2, 3, 2]} scale={[3, 1.5, 1]} target={[0, 0, 0]} />
          <Lightformer form="rect" intensity={1} color="#87947c" position={[3, 1, -2]} scale={[2, 2, 1]} target={[0, 0, 0]} />
          <Lightformer form="ring" intensity={0.8} color="#f1ebdd" position={[0, 4, 0]} scale={2} target={[0, 0, 0]} />
        </Environment>
        <spotLight position={[-1, 2.2, 1.4]} angle={0.5} penumbra={0.8} intensity={20} color="#fbe8c8" castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.0002} />
        <hemisphereLight args={['#f1ebdd', '#17251c', 0.4]} />
        {model.kind === 'guembri' ? <GuembriGLB finish={model.finish} /> : <Qraqeb pairs={model.pairs} />}
        <ContactShadows position={[0, f.floor, 0]} opacity={0.55} scale={model.kind === 'guembri' ? 3 : 1} blur={2.4} far={0.6} color="#0c140f" />
      </Suspense>
      <OrbitControls makeDefault enableDamping autoRotate={autoRotate} autoRotateSpeed={0.6} minDistance={f.min} maxDistance={f.max} enablePan={false} />
      <Rig kind={model.kind} resetNonce={resetNonce} />
    </Canvas>
  )
}
