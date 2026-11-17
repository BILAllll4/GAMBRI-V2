/**
 * Live 3D previews for the Full Collection and the cart. Every plate with a
 * model owns a drei <View>; all of them draw through ONE shared canvas
 * (ShowroomCanvas, fixed over the page), so a whole catalogue of turnable
 * pieces costs a single WebGL context. Pointer over a plate spins that piece
 * on its own Turntable.
 */
import { Suspense, type RefObject } from 'react'
import { Environment, Lightformer, PerspectiveCamera, View } from '@react-three/drei'
import { GuembriGLB } from '../../three/GuembriGLB'
import { Qraqeb } from '../../three/Qraqeb'
import { Accessory } from '../../three/Accessories'
import { Turntable } from '../../three/Turntable'
import type { ModelVisual } from '../../data/collection'

/** camera distance per kind, so every piece fills its plate the same way */
function distance(v: ModelVisual) {
  if (v.kind === 'guembri') return 4.0
  if (v.kind === 'qraqeb') return 3.9
  return 3.5
}

/** a three-quarter pose, different for each plate so a grid never looks stamped */
const POSES = [-0.45, 0.4, -0.2, 0.55, -0.6, 0.15]

function Model({ v }: { v: ModelVisual }) {
  if (v.kind === 'guembri')
    return (
      // lying along +X in model space → stand it up, neck to the ceiling, skin to the visitor
      <group rotation={[0, Math.PI / 2, Math.PI / 2]} position={[0, 0.02, 0]} scale={v.scale ?? 1}>
        <GuembriGLB finish={v.finish} />
      </group>
    )
  if (v.kind === 'qraqeb')
    return (
      // the pair stands on end so it fills the tall plate; cups toward the visitor
      <group rotation={[0, 0, Math.PI / 2]} scale={v.pairs === 2 ? 3.6 : 4.2}>
        <Qraqeb pairs={v.pairs} finish={v.finish} />
      </group>
    )
  return <Accessory id={v.id} />
}

export function ProductView({ visual, hover, index = 0, className }: { visual: ModelVisual; hover: RefObject<boolean>; index?: number; className?: string }) {
  return (
    <View className={className}>
      <PerspectiveCamera makeDefault fov={24} position={[0, 0.02, distance(visual)]} near={0.05} far={20} />
      <Suspense fallback={null}>
        <Environment resolution={64} frames={1}>
          <Lightformer form="rect" intensity={2.2} color="#f6e6c8" position={[-2, 3, 2]} scale={[3, 1.5, 1]} target={[0, 0, 0]} />
          <Lightformer form="rect" intensity={0.9} color="#9aa48a" position={[3, 1, -2]} scale={[2, 2, 1]} target={[0, 0, 0]} />
        </Environment>
        {/* museum key light from above, warm; a soft fill from the front */}
        <spotLight position={[0.6, 3, 2.2]} angle={0.45} penumbra={0.9} intensity={42} color="#fbe6c4" />
        <directionalLight position={[-1.5, 0.8, 3]} intensity={0.9} color="#f6f1e6" />
        <hemisphereLight args={['#f6f1e6', '#6b5a40', 0.8]} />
        <Turntable hover={hover} pose={POSES[index % POSES.length]}>
          <Model v={visual} />
        </Turntable>
      </Suspense>
    </View>
  )
}
