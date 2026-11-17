/**
 * Playable note positions on the strings: a small gold marker, a glow, an
 * expanding sound-wave ring. Key labels are a DOM overlay (see NoteLabels.tsx)
 * positioned here every frame by projecting each marker to screen space.
 */
import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Billboard } from '@react-three/drei'
import * as THREE from 'three'
import { NOTES, STRINGS, type Note } from '../data/notes'
import { notePulse } from '../store/useGuembri'
import { labelAnchors } from '../sections/guembri/NoteLabels'
import { engine } from '../audio/engine'
import { stringPoint } from './stringPath'

/** where each marker sits along its string (open notes sit just off the binding) */
const markerFrac = (n: Note) => (n.stop > 0 ? n.stop : n.string === 2 ? 0.12 : 0.05)
let glowTex: THREE.Texture | null = null
function getGlow() {
  if (glowTex) return glowTex
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  g.addColorStop(0, 'rgba(255,214,150,1)')
  g.addColorStop(0.25, 'rgba(214,160,86,.55)')
  g.addColorStop(1, 'rgba(182,138,74,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 128, 128)
  glowTex = new THREE.CanvasTexture(c)
  glowTex.colorSpace = THREE.SRGBColorSpace
  return glowTex
}

const play = (key: string) => void engine.unlock().then(() => engine.play(key, 0.95))

function Marker({ note }: { note: Note }) {
  const s = STRINGS[note.string]
  const pos = useMemo(() => stringPoint(s, markerFrac(note)), [s, note])
  const gem = useRef<THREE.Mesh>(null)
  const glow = useRef<THREE.Sprite>(null)
  const ring = useRef<THREE.Mesh>(null)
  const ring2 = useRef<THREE.Mesh>(null)
  const hover = useRef(false)
  const anchorRef = useRef<THREE.Group>(null)
  const world = useMemo(() => new THREE.Vector3(), [])
  const size = useThree((st) => st.size)

  const gemMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#b18a52', metalness: 0.9, roughness: 0.3, emissive: '#b18a52', emissiveIntensity: 0.15 }),
    [],
  )
  const glowMat = useMemo(
    () => new THREE.SpriteMaterial({ map: getGlow(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }),
    [],
  )
  const ringMats = useMemo(
    () =>
      [0, 1].map(
        () => new THREE.MeshBasicMaterial({ color: '#d6a35a', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }),
      ),
    [],
  )

  useFrame(({ camera }, dt) => {
    // project the label anchor to screen space
    const el = labelAnchors.get(note.key)
    if (el && anchorRef.current) {
      anchorRef.current.getWorldPosition(world)
      world.project(camera)
      const visible = world.z < 1 && Math.abs(world.x) < 1.2 && Math.abs(world.y) < 1.2
      el.style.transform = `translate3d(${((world.x + 1) / 2) * size.width}px, ${((1 - world.y) / 2) * size.height}px, 0)`
      el.style.visibility = visible ? 'visible' : 'hidden'
    }
    const t0 = notePulse.get(note.key) ?? -100
    const age = performance.now() / 1000 - t0
    const p = Math.max(0, 1 - age / 0.9) // 0..1 recent-ness
    if (gem.current) {
      gem.current.rotation.y += dt * (0.6 + p * 8)
      const target = 1 + p * 0.8 + (hover.current ? 0.35 : 0)
      gem.current.scale.setScalar(THREE.MathUtils.lerp(gem.current.scale.x, target, 0.25))
      gemMat.emissiveIntensity = 0.15 + p * 2.2 + (hover.current ? 0.6 : 0)
    }
    if (glow.current) {
      glowMat.opacity = p * 0.9 + (hover.current ? 0.25 : 0)
      glow.current.scale.setScalar(0.03 + p * 0.05)
    }
    // two staggered sound-wave rings
    ;[ring, ring2].forEach((r, i) => {
      if (!r.current) return
      const a = age - i * 0.12
      const k = a > 0 && a < 1.1 ? a / 1.1 : 1
      r.current.scale.setScalar(0.004 + k * 0.07)
      ringMats[i].opacity = a > 0 && a < 1.1 ? (1 - k) * 0.6 : 0
    })
  })

  return (
    <group position={pos}>
      <group ref={anchorRef} position={[0, 0.016, 0]} />
      <group position={[0, 0.011, 0]}>
        <mesh
          ref={gem}
          material={gemMat}
          onPointerOver={(e) => {
            e.stopPropagation()
            hover.current = true
            document.body.style.cursor = 'pointer'
          }}
          onPointerOut={() => {
            hover.current = false
            document.body.style.cursor = ''
          }}
          onPointerDown={(e) => {
            e.stopPropagation()
            play(note.key)
          }}
        >
          <octahedronGeometry args={[0.0042, 0]} />
        </mesh>
        <sprite ref={glow} material={glowMat} />
        <Billboard>
          <mesh ref={ring} material={ringMats[0]}>
            <ringGeometry args={[0.92, 1, 48]} />
          </mesh>
          <mesh ref={ring2} material={ringMats[1]}>
            <ringGeometry args={[0.95, 1, 48]} />
          </mesh>
        </Billboard>
      </group>
    </group>
  )
}

export function NoteMarkers() {
  return (
    <group>
      {NOTES.map((n) => (
        <Marker key={n.key} note={n} />
      ))}
    </group>
  )
}

