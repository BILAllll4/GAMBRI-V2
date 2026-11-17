/**
 * One WebGL canvas for a whole page of product previews. Each plate owns a
 * drei <View> that tracks its element, so every model renders through this
 * single fixed canvas (see pages/store/CollectionScene).
 */
import { Canvas } from '@react-three/fiber'
import { View } from '@react-three/drei'
import * as THREE from 'three'

export function ShowroomCanvas({ active }: { active: boolean }) {
  return (
    <Canvas
      frameloop={active ? 'always' : 'never'}
      dpr={[1, 1.6]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = 1.05
      }}
      style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 5 }}
      aria-hidden
    >
      <View.Port />
    </Canvas>
  )
}
