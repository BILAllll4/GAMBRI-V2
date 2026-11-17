/**
 * THE PORTAL — a Moroccan palace gate in daylight (PalaceGate: zellige,
 * carved cedar, green tile roof) on a cobbled court, and behind it the showroom: three display
 * cards, each with a 3D guembri (PortalShowroom).
 * Everything is driven by a 0..1 scroll progress value (no React re-renders).
 */
import { useMemo, useRef, type RefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { EffectComposer, Vignette, ToneMapping } from '@react-three/postprocessing'
import { Environment, Lightformer } from '@react-three/drei'
import { ToneMappingMode } from 'postprocessing'
import * as THREE from 'three'
import { PalaceGate } from './PalaceGate'
import { cobbles } from './gateTextures'
import { PortalShowroom, STOP_Z, STOP_Y, type CardLabel, type ShowpieceItem } from './PortalShowroom'

/*
 * Scroll choreography (progress 0..1 over the portal's scroll track):
 *   0.02–0.50  the camera approaches the doorway
 *   0.18–0.42  the doors swing open: the three cards are already visible through the opening
 *   0.42–0.70  the camera walks through and stops in front of the cards
 *   0.60–0.72  the cards' names, prices and lines fade in
 *   0.72–1.00  hold: a finished, interactive showroom (hover to turn, click to open)
 * After 1 the sticky stage simply scrolls up and the Full Collection follows below it.
 */
export const PHASES = { approach: [0.02, 0.5], open: [0.18, 0.42], through: [0.42, 0.7], reveal: [0.6, 0.72] } as const
const ss = (p: number, [a, b]: readonly [number, number]) => THREE.MathUtils.smoothstep(p, a, b)

function Portal({ progress, items, labels, onOpen }: { progress: RefObject<number>; items: ShowpieceItem[]; labels: CardLabel[]; onOpen: (slug: string, name: string) => void }) {
  const spill = useRef<THREE.SpotLight>(null)
  const sun = useRef<THREE.DirectionalLight>(null)
  const smooth = useRef(0)
  const reveal = useRef(0)
  const opened = useRef(0)
  const scene = useThree((s) => s.scene)
  const gl = useThree((s) => s.gl)
  const lastOpen = useRef(-1)
  const shadowFrames = useRef(3)

  useFrame(({ camera }, dt) => {
    const target = progress.current ?? 0
    smooth.current += (target - smooth.current) * (1 - Math.exp(-dt * 6))
    const p = smooth.current
    const approach = ss(p, PHASES.approach)
    const through = ss(p, PHASES.through)
    const open = ss(p, PHASES.open)
    // approach the door, then walk through it and stop just past the open leaves
    const z = THREE.MathUtils.lerp(THREE.MathUtils.lerp(11, 2.4, approach), STOP_Z, through)
    // on portrait screens the names hang below the cards: aim a little lower so cards + names sit centred
    const stopY = (camera as THREE.PerspectiveCamera).aspect < 0.8 ? STOP_Y - 0.3 : STOP_Y
    camera.position.set(Math.sin(p * 2.2) * 0.3 * (1 - approach), THREE.MathUtils.lerp(1.8 - 0.1 * approach, stopY, through), z)
    // from afar the view tilts up a little so the whole gate (roof included) is in frame
    camera.lookAt(0, THREE.MathUtils.lerp(THREE.MathUtils.lerp(3.7, 1.9, approach), stopY, through), z - 10)
    // the doors swing open (PalaceGate reads this)
    opened.current = open
    reveal.current = ss(p, PHASES.reveal)
    // the night fog outside thins out inside the room, so the cards keep their true colours
    const fog = scene.fog as THREE.Fog | null
    if (fog) {
      fog.near = THREE.MathUtils.lerp(30, 40, through)
      fog.far = THREE.MathUtils.lerp(90, 120, through)
    }
    beamMat.uniforms.uOpacity.value = open * 0.18 * (1 - through)
    if (spill.current) spill.current.intensity = 4 + open * 140
    // the sun stays outside: inside, the showroom keeps its own gallery light
    if (sun.current) {
      sun.current.intensity = 2.8 * (1 - through)
      sun.current.castShadow = through < 0.6
    }
    // the gate does not move: its shadows are re-rendered only while the leaves swing,
    // and every frame once inside (the showroom pieces turn); never just because the camera moves
    if (Math.abs(open - lastOpen.current) > 1e-4) {
      lastOpen.current = open
      shadowFrames.current = 2
    }
    gl.shadowMap.autoUpdate = through > 0.6
    if (shadowFrames.current > 0) {
      gl.shadowMap.needsUpdate = true
      shadowFrames.current--
    }
  })

  const court = useMemo(() => {
    const t = cobbles(1)
    for (const m of [t.map, t.bumpMap, t.roughnessMap]) m.repeat.set(40 / 1.6, 30 / 1.6)
    return new THREE.MeshStandardMaterial({ ...t, roughness: 1, bumpScale: 2 })
  }, [])

  const beamMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        uniforms: { uOpacity: { value: 0 } },
        vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `uniform float uOpacity; varying vec2 vUv;
          void main(){ float a = (1.0 - vUv.y) * smoothstep(0.0, 0.25, vUv.x) * smoothstep(1.0, 0.75, vUv.x);
          gl_FragColor = vec4(1.0, 0.82, 0.52, a * uOpacity * 0.5); }`,
      }),
    [],
  )

  return (
    <group>
      {/* the cobbled court in front of the gate */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 15]} receiveShadow material={court}>
        <planeGeometry args={[40, 30]} />
      </mesh>
      {/* the Tiznit doorway in its rampart; a warm lantern above it, as on the reference */}
      <PalaceGate open={opened} />
      {/* daylight: a low warm sun from the front right, sky fill, bounce from the court */}
      <directionalLight
        ref={sun}
        position={[12, 5.2, 9]}
        intensity={2.8}
        color="#ffcf8f"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0003}
        shadow-normalBias={0.025}
        shadow-camera-left={-11}
        shadow-camera-right={11}
        shadow-camera-top={10}
        shadow-camera-bottom={-3}
        shadow-camera-near={1}
        shadow-camera-far={45}
      />
      <hemisphereLight args={['#9fbcae', '#b08a5c', 0.55]} />

      {/* the showroom behind the door: a sand floor from the threshold back, and the three cards */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, -15.7]} receiveShadow>
        <planeGeometry args={[16, 30]} />
        <meshStandardMaterial color="#c9b28a" roughness={0.9} />
      </mesh>
      <PortalShowroom items={items} reveal={reveal} glow={opened} labels={labels} onOpen={onOpen} />
      {/* light shafts spilling out */}
      <mesh position={[0, 1.6, 1.8]} rotation={[-Math.PI / 2 + 0.25, 0, 0]} material={beamMat}>
        <planeGeometry args={[2.8, 4.6]} />
      </mesh>
      <spotLight ref={spill} position={[0, 2.8, -2.5]} angle={0.7} penumbra={0.6} intensity={4} color="#ffd59a" target-position={[0, 0, 5]} />
      {/* sky and sun reflected in the glazed tiles */}
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={0.7} color="#7fa898" position={[0, 8, 6]} scale={[30, 10, 1]} target={[0, 2, 0]} />
        <Lightformer form="circle" intensity={3.5} color="#ffc98a" position={[12, 5.2, 9]} scale={2.5} target={[0, 2, 0]} />
        <Lightformer form="rect" intensity={0.5} color="#b89c78" position={[0, -2, 8]} scale={[30, 4, 1]} target={[0, 2, 0]} />
      </Environment>
    </group>
  )
}

/** the evening sky behind the gate, as a screen-space vertical gradient */
function skyGradient() {
  const c = document.createElement('canvas')
  c.width = 4
  c.height = 512
  const g = c.getContext('2d')!
  const gr = g.createLinearGradient(0, 0, 0, 512)
  gr.addColorStop(0, '#0d2a20')
  gr.addColorStop(0.22, '#1c4536')
  gr.addColorStop(0.42, '#4f7466')
  gr.addColorStop(0.6, '#b59a6c')
  gr.addColorStop(0.75, '#e8bf82')
  gr.addColorStop(1, '#f3d5a2')
  g.fillStyle = gr
  g.fillRect(0, 0, 4, 512)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

export function PortalScene({
  progress,
  active,
  items,
  labels,
  onOpen,
}: {
  progress: RefObject<number>
  active: boolean
  items: ShowpieceItem[]
  labels: CardLabel[]
  onOpen: (slug: string, name: string) => void
}) {
  return (
    <Canvas
      shadows
      frameloop={active ? 'always' : 'never'}
      dpr={[1, 1.25]}
      gl={{ antialias: false, powerPreference: 'high-performance' }}
      camera={{ fov: 40, near: 0.1, far: 60, position: [0, 1.8, 11] }}
      onCreated={({ gl, scene }) => {
        gl.toneMapping = THREE.NoToneMapping
        // golden hour, in the site's colours: the sky starts in the same deep green
        // the guembri section ends on (#0d2a20) and warms to a gold glow at the horizon,
        // so scrolling from one section into the other reads as one continuous evening
        scene.background = skyGradient()
        scene.fog = new THREE.Fog('#d9b483', 30, 90)
      }}
    >
      <Portal progress={progress} items={items} labels={labels} onOpen={onOpen} />
      {/* no bloom: nothing in the showroom may glow soft. A light vignette only. */}
      <EffectComposer enableNormalPass={false} multisampling={2}>
        <Vignette offset={0.3} darkness={0.35} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      </EffectComposer>
    </Canvas>
  )
}
