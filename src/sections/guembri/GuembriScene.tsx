/**
 * GAMBRI V2 — THE GUEMBRI: one canvas, one story:
 *   SELECT → ZOOM OUT → ISOLATE → TRANSITION → PLAY
 *
 *  select: one large upright guembri (slightly left of centre), turning
 *    slowly in a dark room, 360° drag rotation; three small 3D guembris sit
 *    in a carousel along the bottom (camera-anchored, clickable). Choosing
 *    another one turns the large instrument through a full spin while its
 *    finish changes — it is never swapped for another object.
 *  zoom out: the whole scene pulls back, the carousel sinks away.
 *  isolate: the chosen guembri comes to the centre and the camera closes in.
 *  transition / play: the same object turns flat into the playing pose and the
 *    existing musical interaction takes over (strings, notes, keys, music).
 */
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer, OrbitControls, PerformanceMonitor, useGLTF } from '@react-three/drei'
import type { OrbitControls as OrbitImpl } from 'three-stdlib'
import * as THREE from 'three'
import { GUEMBRI_GLB, GuembriGLB } from '../../three/GuembriGLB'
import { dropShadow, hull, neckCarving, skinEngraving } from '../../three/engraving'
import { GEO } from '../../data/notes'
import { OPTIONS } from '../../data/selection'
import { useGuembri } from '../../store/useGuembri'
import { engine } from '../../audio/engine'
import { journey, zoomBy, travelOf, zoomOutOf, isolateOf, useSelection, SLOTS, T } from './journey'

/** instrument extent in model space (spike knot → sersera rings), metres */
const X_MIN = -0.7
const X_MAX = 0.72
const LENGTH = X_MAX - X_MIN
const WIDTH = 0.24
const CX = (X_MIN + X_MAX) / 2
const FOV = 16
const TURN = 0.52

type Pose = { target: THREE.Vector3; dir: THREE.Vector3; up: THREE.Vector3; dist: number; shiftX: number; shiftY: number }
const tanHalf = Math.tan(THREE.MathUtils.degToRad(FOV) / 2)
const upright = () => new THREE.Vector3(0, Math.cos(TURN), Math.sin(TURN))

/** SELECT: upright, ~60% of the height, slightly left of centre and lifted above the carousel */
function selectPose(aspect: number): Pose {
  const portrait = aspect < 0.9
  const visH = portrait ? LENGTH / 0.48 : LENGTH / 0.72
  const rtl = document.documentElement.dir === 'rtl'
  return { target: new THREE.Vector3(CX, 0, 0), dir: upright(), up: new THREE.Vector3(1, 0, 0), dist: visH / (2 * tanHalf), shiftX: portrait ? 0 : rtl ? -0.08 : 0.08, shiftY: portrait ? 0.24 : 0.11 }
}
/** ISOLATE: centred, the same size as in the selection (no zoom) */
function isolatePose(aspect: number): Pose {
  const portrait = aspect < 0.9
  const visH = portrait ? LENGTH / 0.6 : LENGTH / 0.74
  return { target: new THREE.Vector3(CX, 0, 0), dir: upright(), up: new THREE.Vector3(1, 0, 0), dist: visH / (2 * tanHalf), shiftX: 0, shiftY: 0 }
}
/** PLAY: the top-down framing (neck right; neck up on portrait screens) */
function playPose(aspect: number): Pose {
  if (aspect < 0.9) {
    const visH = Math.max(LENGTH / 0.78, WIDTH / 0.42 / aspect)
    return { target: new THREE.Vector3(CX + visH * 0.045, 0, 0), dir: new THREE.Vector3(0, 1, 0), up: new THREE.Vector3(1, 0, 0), dist: visH / (2 * tanHalf), shiftX: 0, shiftY: 0 }
  }
  const visW = Math.max(LENGTH / 0.88, (WIDTH / 0.4) * aspect)
  return { target: new THREE.Vector3(CX, 0, 0), dir: new THREE.Vector3(0, 1, 0), up: new THREE.Vector3(0, 0, -1), dist: visW / aspect / (2 * tanHalf), shiftX: 0, shiftY: 0 }
}

const smooth01 = (x: number) => x * x * (3 - 2 * x)
const _q = new THREE.Quaternion()
const _id = new THREE.Quaternion()
function blendDir(a: THREE.Vector3, b: THREE.Vector3, e: number, out: THREE.Vector3) {
  _q.setFromUnitVectors(a, b)
  return out.copy(a).applyQuaternion(_id.identity().slerp(_q, e))
}
function blendPose(a: Pose, b: Pose, e: number): Pose {
  return {
    target: a.target.clone().lerp(b.target, e),
    dir: blendDir(a.dir, b.dir, e, new THREE.Vector3()),
    up: blendDir(a.up, b.up, e, new THREE.Vector3()),
    dist: THREE.MathUtils.lerp(a.dist, b.dist, e),
    shiftX: THREE.MathUtils.lerp(a.shiftX, b.shiftX, e),
    shiftY: THREE.MathUtils.lerp(a.shiftY, b.shiftY, e),
  }
}
/** the camera pose for a scroll position: select → isolate → play */
function poseAt(aspect: number, iso: number, travel: number) {
  return blendPose(blendPose(selectPose(aspect), isolatePose(aspect), smooth01(iso)), playPose(aspect), smooth01(travel))
}

type Mode = 'select' | 'blend' | 'play'

function JourneyRig({ mode, setMode }: { mode: Mode; setMode: (m: Mode) => void }) {
  const { camera, size } = useThree()
  const cam = camera as THREE.PerspectiveCamera
  const sm = useRef({ zo: zoomOutOf(), iso: isolateOf(), tr: travelOf() })
  const zoom = useRef(1)
  const pos = useMemo(() => new THREE.Vector3(), [])
  const first = useRef(true)

  useFrame((_, dt) => {
    const aspect = size.width / size.height
    const k = 1 - Math.exp(-dt * 7)
    const s = sm.current
    s.zo += (zoomOutOf() - s.zo) * k
    s.iso += (isolateOf() - s.iso) * k
    s.tr += (travelOf() - s.tr) * k
    const atSelect = journey.p < T.select[1] && s.zo < 0.004 && s.iso < 0.004
    const atPlay = s.tr > 0.996 && travelOf() > 0.996
    const next: Mode = atSelect ? 'select' : atPlay ? 'play' : 'blend'
    if (next !== mode) setMode(next)

    const pose = poseAt(aspect, s.iso, s.tr)
    if (mode === 'blend' || first.current) {
      pos.copy(pose.target).addScaledVector(pose.dir, pose.dist)
      const kk = first.current ? 1 : 1 - Math.exp(-dt * 8)
      cam.position.lerp(pos, kk)
      cam.up.lerp(pose.up, kk).normalize()
      cam.lookAt(pose.target)
      first.current = false
      journey.zoom += (1 - journey.zoom) * (1 - Math.exp(-dt * 4))
    }
    // no pull-back zoom: the instrument keeps its size and turns instead (MainInstrument)
    const target = journey.zoom
    zoom.current += (target - zoom.current) * (1 - Math.exp(-dt * 6))
    cam.zoom = zoom.current
    const w = size.width
    const h = size.height
    if (Math.abs(pose.shiftX) > 1e-4 || Math.abs(pose.shiftY) > 1e-4) cam.setViewOffset(w, h, pose.shiftX * w, pose.shiftY * h, w, h)
    else cam.clearViewOffset()
    cam.updateProjectionMatrix()
  })
  return null
}

/** OrbitControls in the selection (full 360° turn, slow drift when idle) and playing poses (small tilt) */
function PoseControls({ mode }: { mode: 'select' | 'play' }) {
  const ref = useRef<OrbitImpl>(null)
  const { camera, size, gl } = useThree()
  const rest = useRef<{ pos: THREE.Vector3 } | null>(null)
  const lastTouch = useRef(performance.now())
  const aspect = size.width / size.height
  const pose = useMemo(() => (mode === 'select' ? selectPose(aspect) : playPose(aspect)), [mode, aspect])
  useState(() => {
    const at = pose.target.clone().addScaledVector(pose.dir, pose.dist)
    camera.up.copy(pose.up)
    if (camera.position.distanceTo(at) > pose.dist * 0.08) camera.position.copy(at)
    camera.lookAt(pose.target)
    return 0
  })

  useEffect(() => {
    const c = ref.current
    if (!c) return
    const a0 = c.getAzimuthalAngle()
    const p0 = c.getPolarAngle()
    if (mode === 'select') {
      c.minPolarAngle = Math.max(0.15, p0 - 0.45)
      c.maxPolarAngle = Math.min(Math.PI - 0.15, p0 + 0.45)
    } else {
      c.minAzimuthAngle = a0 - 0.45
      c.maxAzimuthAngle = a0 + 0.45
      c.minPolarAngle = Math.max(0.05, p0 - 0.38)
      c.maxPolarAngle = Math.min(Math.PI - 0.05, p0 + 0.38)
    }
    rest.current = { pos: camera.position.clone() }
    gl.domElement.style.touchAction = 'pan-y'
    const onStart = () => (lastTouch.current = Infinity)
    const onEnd = () => (lastTouch.current = performance.now())
    c.addEventListener('start', onStart)
    c.addEventListener('end', onEnd)
    return () => {
      c.removeEventListener('start', onStart)
      c.removeEventListener('end', onEnd)
    }
  }, [mode, camera, gl])

  useFrame((_, dt) => {
    const c = ref.current
    if (!c) return
    const idle = performance.now() - lastTouch.current > 2500
    if (mode === 'select') {
      c.autoRotate = idle
      c.autoRotateSpeed = 0.5
    } else if (rest.current && idle) {
      camera.position.lerp(rest.current.pos, 1 - Math.exp(-dt * 2.5))
      c.update()
    }
  })

  return (
    <OrbitControls
      ref={ref}
      makeDefault
      target={pose.target}
      enablePan={false}
      enableZoom={false}
      enableDamping
      dampingFactor={0.08}
      rotateSpeed={0.6}
      touches={{ ONE: THREE.TOUCH.ROTATE, TWO: undefined as unknown as THREE.TOUCH }}
    />
  )
}

/** ctrl/⌘ + wheel and two-finger pinch zoom (plain wheel scrolls the page) */
function ZoomInput() {
  const gl = useThree((s) => s.gl)
  useEffect(() => {
    const el = gl.domElement
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return
      e.preventDefault()
      zoomBy(Math.exp(-e.deltaY * 0.0025))
    }
    const touches = new Map<number, { x: number; y: number }>()
    let startD = 0
    const d = () => {
      const [a, b] = [...touches.values()]
      return Math.hypot(a.x - b.x, a.y - b.y)
    }
    const down = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (touches.size === 2) startD = d()
    }
    const move = (e: PointerEvent) => {
      if (!touches.has(e.pointerId)) return
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (touches.size === 2 && startD > 0) {
        const now = d()
        zoomBy(now / startD)
        startD = now
      }
    }
    const up = (e: PointerEvent) => {
      touches.delete(e.pointerId)
      startD = 0
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('pointerdown', down)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
  }, [gl])
  return null
}

/* --------------------------------------------------------------- carousel */

/** model axes → camera axes: long axis (X) up the screen, skin (Y) toward the viewer */
const UPRIGHT_LOCAL = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0)))

/**
 * One small guembri in the bottom carousel: anchored to the camera at its slot,
 * turning slowly when selected, sinking away during the zoom-out. Click selects.
 */
function CarouselItem({ index }: { index: number }) {
  const g = useRef<THREE.Group>(null)
  const { camera, size } = useThree()
  const selected = useSelection((s) => s.index === index)
  const hover = useRef(false)
  const spin = useRef(0.5 + index * 0.4)
  const lift = useRef(0)
  const tmp = useMemo(() => ({ ndc: new THREE.Vector3(), dir: new THREE.Vector3(), q: new THREE.Quaternion(), s: new THREE.Quaternion() }), [])
  const hit = useMemo(() => new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false }), [])

  useFrame((_, dt) => {
    const el = g.current
    if (!el) return
    const cam = camera as THREE.PerspectiveCamera
    const portrait = size.width / size.height < 0.9
    const slots = portrait ? SLOTS.portrait : SLOTS.landscape
    const zo = zoomOutOf()
    const gone = THREE.MathUtils.smoothstep(zo, 0, 0.7)
    el.visible = gone < 0.999
    if (!el.visible) return
    // the slot on screen, sinking away as the scene zooms out
    const sx = slots.x[index]
    const sy = slots.y + gone * 0.22
    tmp.ndc.set(sx * 2 - 1, -(sy * 2 - 1), 0.5).unproject(cam)
    tmp.dir.copy(tmp.ndc).sub(cam.position).normalize()
    const D = cam.position.distanceTo(new THREE.Vector3(CX, 0, 0)) * 0.55
    el.position.copy(cam.position).addScaledVector(tmp.dir, D)
    // ~15% of the viewport tall (selected a little larger), shrinking away
    lift.current += ((selected ? 1 : hover.current ? 0.5 : 0) - lift.current) * (1 - Math.exp(-dt * 6))
    const visH = (2 * D * tanHalf) / cam.zoom
    el.scale.setScalar(((0.17 + lift.current * 0.05) * visH * (1 - gone)) / LENGTH)
    spin.current += dt * (selected ? 0.7 : 0.15)
    tmp.s.setFromAxisAngle(new THREE.Vector3(1, 0, 0), spin.current)
    el.quaternion.copy(cam.quaternion).multiply(UPRIGHT_LOCAL).multiply(tmp.s)
  })

  return (
    <group ref={g}>
      {/* centre the instrument on its slot */}
      <group position={[-CX, 0, 0]}>
        <GuembriGLB finish={OPTIONS[index].finish} />
        <mesh
          material={hit}
          position={[CX, 0, 0]}
          onClick={(e) => {
            e.stopPropagation()
            if (zoomOutOf() < 0.05) useSelection.getState().select(index)
          }}
          onPointerOver={(e) => {
            e.stopPropagation()
            hover.current = true
            document.body.style.cursor = 'pointer'
          }}
          onPointerOut={() => {
            hover.current = false
            document.body.style.cursor = ''
          }}
        >
          <boxGeometry args={[LENGTH, 0.3, 0.3]} />
        </mesh>
      </group>
    </group>
  )
}

/* --------------------------------------------------------------- the main instrument */

/**
 * The selected guembri.
 *  - choosing another one slides it out sideways (the way of the arrow) and the
 *    new finish slides in from the other side, same size, no zoom;
 *  - on scroll it glides to the centre turning once on its long axis (showcase
 *    turn), then lays down into the playing pose.
 */
function MainInstrument() {
  const index = useSelection((s) => s.index)
  const [shown, setShown] = useState(index)
  const anim = useRef({ t: 1, dir: 1 })
  const g = useRef<THREE.Group>(null)
  const camera = useThree((s) => s.camera)
  const right = useMemo(() => new THREE.Vector3(), [])
  const attach = useMemo(() => ({ leather: <SkinEngraving />, neck: <NeckCarving /> }), [])

  useEffect(() => {
    if (index !== shown) anim.current = { t: 0, dir: (index - shown + 3) % 3 === 1 ? 1 : -1 }
  }, [index, shown])

  useFrame((_, dt) => {
    const a = anim.current
    if (a.t < 1) {
      const prev = a.t
      a.t = Math.min(1, a.t + dt / 0.8)
      if (prev < 0.5 && a.t >= 0.5) setShown(useSelection.getState().index)
    }
    if (!g.current) return
    // slide: out along screen-right × dir, then in from the opposite side
    const out = a.t < 0.5 ? smooth01(a.t / 0.5) : 0
    const back = a.t >= 0.5 ? 1 - smooth01((a.t - 0.5) / 0.5) : 0
    const slide = a.t < 1 ? (a.t < 0.5 ? -a.dir * out : a.dir * back) : 0
    right.setFromMatrixColumn(camera.matrixWorld, 0)
    g.current.position.copy(right).multiplyScalar(slide * LENGTH * 1.4)
    // showcase turn on the long axis while the scene clears (one full turn), plus a tilt in the slide
    const turn = THREE.MathUtils.smoothstep(journey.p, T.zoomOut[0], T.isolate[1]) * Math.PI * 2
    g.current.rotation.x = turn + slide * 0.9
    g.current.scale.setScalar(1)
  })

  return (
    <group ref={g}>
      <GuembriGLB interactive finish={OPTIONS[shown].finish} stringColor="#2a1a10" attach={attach} />
    </group>
  )
}

function ReadySignal() {
  const frames = useRef(0)
  useFrame(() => {
    frames.current++
    if (frames.current === 3) useGuembri.getState().set({ ready: true })
  })
  return null
}

/** cinematic light: warm key, gold rim, cool fill; opening up over the strings in the playing pose */
function Lights() {
  const note = useRef<THREE.PointLight>(null)
  const key = useRef<THREE.DirectionalLight>(null)
  const rim = useRef<THREE.DirectionalLight>(null)
  const hemi = useRef<THREE.HemisphereLight>(null)
  const top = useRef<THREE.DirectionalLight>(null)
  const smooth = useRef(0)
  useFrame((_, dt) => {
    const { rms } = engine.levels()
    smooth.current += (rms - smooth.current) * (1 - Math.exp(-dt * 12))
    const t = travelOf()
    const iso = isolateOf()
    if (note.current) note.current.intensity = smooth.current * 0.9
    if (key.current) key.current.intensity = THREE.MathUtils.lerp(2.5 + iso * 0.4, 1.6, t) + smooth.current * 0.6
    if (rim.current) rim.current.intensity = THREE.MathUtils.lerp(2.0 + iso * 0.8, 0.4, t)
    if (hemi.current) hemi.current.intensity = THREE.MathUtils.lerp(0.55 - iso * 0.2, 1.05, t)
    if (top.current) top.current.intensity = THREE.MathUtils.lerp(0.2, 1.1, t)
  })
  return (
    <>
      <hemisphereLight ref={hemi} args={['#f4ead6', '#1b2a20', 0.55]} />
      <directionalLight ref={key} position={[1.6, 1.8, 1.6]} intensity={2.5} color="#ffe2b8" />
      <directionalLight ref={rim} position={[-0.6, -1.4, -1.8]} intensity={2.0} color="#d6a35a" />
      <directionalLight ref={top} position={[-0.6, 2.4, -0.9]} intensity={0.2} color="#fff6e8" />
      <directionalLight position={[0.8, 1.6, 0.9]} intensity={0.45} color="#e6ecf2" />
      <pointLight ref={note} position={[0.0, 0.25, 0]} intensity={0} distance={1.2} decay={2} color="#ffd9a0" />
    </>
  )
}

/** the floral engraving on the skin */
function SkinEngraving() {
  const { scene } = useGLTF(GUEMBRI_GLB)
  const skin = useMemo(() => {
    const mesh = scene.getObjectByName('Skin') as THREE.Mesh | undefined
    if (!mesh) return null
    const pos = mesh.geometry.getAttribute('position')
    let top = -Infinity
    for (let i = 0; i < pos.count; i++) top = Math.max(top, pos.getY(i))
    const pts: [number, number][] = []
    for (let i = 0; i < pos.count; i++) if (pos.getY(i) > top - 0.004) pts.push([pos.getX(i), pos.getZ(i)])
    const outline = hull(pts)
    const b = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity }
    for (const [x, z] of outline) {
      b.minX = Math.min(b.minX, x)
      b.maxX = Math.max(b.maxX, x)
      b.minZ = Math.min(b.minZ, z)
      b.maxZ = Math.max(b.maxZ, z)
    }
    const mat = new THREE.MeshBasicMaterial({ map: skinEngraving(outline, b), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 })
    return { mat, top, w: b.maxX - b.minX, h: b.maxZ - b.minZ, x: (b.minX + b.maxX) / 2, z: (b.minZ + b.maxZ) / 2 }
  }, [scene])
  if (!skin) return null
  return (
    <mesh material={skin.mat} position={[skin.x, skin.top + 0.0006, skin.z]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
      <planeGeometry args={[skin.w, skin.h]} />
    </mesh>
  )
}

/** the diamond carving on the neck */
function NeckCarving() {
  const neck = useMemo(() => {
    const map = neckCarving()
    const start = GEO.bodyEnd + 0.01
    const end = 0.585
    const len = end - start
    map.repeat.set(1, len / 0.034)
    const mat = new THREE.MeshStandardMaterial({ map, roughness: 0.55, polygonOffset: true, polygonOffsetFactor: -2 })
    const geo = new THREE.CylinderGeometry(GEO.neckRadius + 0.0006, GEO.neckRadius + 0.0006, len, 24, 1, true, Math.PI, Math.PI)
    return { mat, geo, x: (start + end) / 2 }
  }, [])
  return <mesh geometry={neck.geo} material={neck.mat} position={[neck.x, GEO.neckY, 0]} rotation={[0, 0, -Math.PI / 2]} renderOrder={1} />
}

/** one soft shadow under the instrument in the playing pose */
function DropShadow() {
  const { scene } = useGLTF(GUEMBRI_GLB)
  const s = useMemo(() => {
    const mesh = scene.getObjectByName('Body') as THREE.Mesh | undefined
    if (!mesh) return null
    const pos = mesh.geometry.getAttribute('position')
    const pts: [number, number][] = []
    for (let i = 0; i < pos.count; i++) pts.push([pos.getX(i), pos.getZ(i)])
    const b = { minX: X_MIN - 0.12, maxX: X_MAX + 0.12, minZ: -0.26, maxZ: 0.26 }
    const map = dropShadow(hull(pts), { x0: GEO.bodyEnd - 0.02, x1: 0.66, halfW: GEO.neckRadius }, b)
    const mat = new THREE.MeshBasicMaterial({ map, transparent: true, opacity: 0, depthWrite: false })
    return { mat, w: b.maxX - b.minX, h: b.maxZ - b.minZ, x: (b.minX + b.maxX) / 2 }
  }, [scene])
  const mesh = useRef<THREE.Mesh>(null)
  useFrame(() => {
    if (!s || !mesh.current) return
    const k = THREE.MathUtils.smoothstep(travelOf(), 0.7, 1)
    s.mat.opacity = 0.5 * k
    mesh.current.visible = k > 0.01
  })
  if (!s) return null
  return (
    <mesh ref={mesh} material={s.mat} position={[s.x + 0.012, -0.18, 0.028]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[s.w, s.h]} />
    </mesh>
  )
}

export function GuembriScene({ active }: { active: boolean }) {
  const [quality, setQuality] = useState<'high' | 'low'>(() => (Math.min(window.innerWidth, window.innerHeight) < 700 ? 'low' : 'high'))
  const [mode, setMode] = useState<Mode>(() => (travelOf() > 0.996 ? 'play' : journey.p < T.select[1] ? 'select' : 'blend'))

  return (
    <Canvas
      frameloop={active ? 'always' : 'never'}
      dpr={[1, quality === 'high' ? 1.5 : 1.25]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      camera={{ fov: FOV, near: 0.05, far: 40, position: [CX, 8, 0] }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = 1.05
        gl.setClearColor(0x000000, 0)
      }}
      aria-label="Three-dimensional guembri: drag to turn it"
    >
      <PerformanceMonitor onDecline={() => setQuality('low')} flipflops={2} onFallback={() => setQuality('low')} />
      <Suspense fallback={null}>
        <Environment resolution={128} frames={1}>
          <Lightformer form="rect" intensity={1.4} color="#ffe8c8" position={[-1, 3, -1]} scale={[3, 3, 1]} target={[0, 0, 0]} />
          <Lightformer form="rect" intensity={0.5} color="#9fb6a6" position={[2, 2, 2]} scale={[2, 2, 1]} target={[0, 0, 0]} />
        </Environment>
        <Lights />
        <MainInstrument />
        {[0, 1, 2].map((i) => (
          <CarouselItem key={i} index={i} />
        ))}
        <DropShadow />
        <ReadySignal />
      </Suspense>
      <JourneyRig mode={mode} setMode={setMode} />
      {mode !== 'blend' && <PoseControls key={mode} mode={mode} />}
      <ZoomInput />
    </Canvas>
  )
}
