/**
 * THE SHOWROOM BEHIND THE DOOR — three freestanding display cards in a warm
 * plaster room. Each card is a real object in the scene: an ivory panel with a
 * brass horseshoe-arch inlay, a low pedestal, the 3D guembri standing at its
 * own angle (so its depth, body and neck read differently on each card), and
 * the product's name, price and one line set into the lower part of the panel
 * (plain DOM text owned by PortalSection and placed over the card every frame,
 * so it stays crisp and readable).
 *
 * Hover (pointer over the card or its text) spins that card's instrument on
 * its own Turntable; click opens the product. The room is placed every frame
 * so that, wherever the camera stops past the doorway, all three cards fit
 * the frame at any aspect ratio.
 */
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, type RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { GuembriGLB, GUEMBRI_GLB } from '../../three/GuembriGLB'
import { Turntable } from '../../three/Turntable'
import type { GuembriFinish } from '../../three/Guembri'

export interface ShowpieceItem {
  slug: string
  finish: GuembriFinish
  name: string
  price: string // formatted
  line: string
}

// card layout (m)
export const CARD_W = 0.9
export const CARD_H = 2.6
const GAP = 0.24
const SPAN_W = 3 * CARD_W + 2 * GAP
/** where the camera stops: just past the open door leaves */
export const STOP_Z = -1.7
/** the camera's height and aim once it has stopped (centre of the cards) */
export const STOP_Y = 1.3
const PEDESTAL_TOP = 0.74
/** centre of the text block, in the lower part of the panel */
const TEXT_Y = 0.32
const PIECE_SCALE = 1.08
/** each instrument at its own angle: turned left (body depth shows), nearly frontal, turned right */
const POSES = [0.95, -0.22, -1.05]

useGLTF.preload(GUEMBRI_GLB)

/** distance from the camera to the cards so the whole set fits, with a margin */
export function fitDistance(camera: THREE.PerspectiveCamera) {
  const t = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)
  const needH = (CARD_H + 0.5) / (2 * t)
  const needW = (SPAN_W + 0.36) / (2 * t * camera.aspect)
  return Math.max(needH, needW)
}

/** horseshoe arch outline (opening on the floor line), width w, as a closed band of thickness th */
function archBand(w: number, h: number, th: number) {
  const ring = (inset: number) => {
    const r = w / 2 / Math.cos(0.5) - inset
    const jx = r * Math.cos(0.5)
    const cy = h - r
    const pts: THREE.Vector2[] = [new THREE.Vector2(-jx, 0)]
    for (let i = 0; i <= 48; i++) {
      const a = Math.PI + 0.5 - (Math.PI + 1) * (i / 48)
      pts.push(new THREE.Vector2(r * Math.cos(a), cy + r * Math.sin(a)))
    }
    pts.push(new THREE.Vector2(jx, 0))
    return pts
  }
  const outer = ring(0)
  const inner = ring(th).map((p) => new THREE.Vector2(p.x, Math.max(p.y, th)))
  const s = new THREE.Shape(outer)
  s.holes.push(new THREE.Path(inner.reverse()))
  return new THREE.ShapeGeometry(s, 48)
}

/** the DOM text block for one card (rendered by PortalSection, placed here every frame) */
export interface CardLabel {
  el: HTMLDivElement | null
  hover: { current: boolean }
}

function Card({ item, index, x, reveal, label, onOpen }: { item: ShowpieceItem; index: number; x: number; reveal: RefObject<number>; label: CardLabel; onOpen: (slug: string, name: string) => void }) {
  const hover = label.hover
  const group = useRef<THREE.Group>(null)
  const { camera, size } = useThree()
  const mats = useMemo(
    () => ({
      panel: new THREE.MeshStandardMaterial({ color: '#efe5cf', roughness: 0.88 }),
      edge: new THREE.MeshStandardMaterial({ color: '#d8c7a4', roughness: 0.9 }),
      brass: new THREE.MeshStandardMaterial({ color: '#a8875a', metalness: 0.75, roughness: 0.38, side: THREE.DoubleSide }),
      plinth: new THREE.MeshStandardMaterial({ color: '#d9c7a2', roughness: 0.85 }),
      hit: new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false }),
    }),
    [],
  )
  const arch = useMemo(() => archBand(CARD_W * 0.8, CARD_H - 0.62 - 0.1, 0.012), [])
  const anchor = useMemo(() => new THREE.Vector3(), [])

  const setHover = (v: boolean) => {
    if ((reveal.current ?? 0) < 0.5) v = false
    hover.current = v
    document.body.style.cursor = v ? 'pointer' : ''
  }

  // place the card's text over the lower part of its panel, sized to the card's width on screen.
  // On narrow screens (cards under ~210 px wide) the text hangs just below the card instead,
  // on the floor in front of it, where there is room for a readable size.
  useFrame(() => {
    const el = label.el
    const g = group.current
    if (!el || !g) return
    g.updateWorldMatrix(true, false)
    anchor.set(0, TEXT_Y, 0.03).applyMatrix4(g.matrixWorld)
    const dist = camera.position.distanceTo(anchor)
    const t = Math.tan(THREE.MathUtils.degToRad((camera as THREE.PerspectiveCamera).fov) / 2)
    const px = (CARD_W / (2 * dist * t)) * size.height
    const compact = px < 210
    if (compact) anchor.set(0, -0.02, 0.03).applyMatrix4(g.matrixWorld)
    anchor.project(camera)
    const sx = ((anchor.x + 1) / 2) * size.width
    const sy = ((1 - anchor.y) / 2) * size.height
    el.style.transform = `translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0) translate(-50%, ${compact ? '0' : '-50%'})`
    el.style.width = `${Math.round(px * (compact ? 1.04 : 0.86))}px`
    el.style.setProperty('--s', String(Math.min(1.2, Math.max(0.6, px / 235))))
    el.dataset.compact = compact ? '1' : '0'
    const r = reveal.current ?? 0
    el.style.opacity = String(r)
    el.style.visibility = r > 0.01 ? 'visible' : 'hidden'
    el.style.pointerEvents = r > 0.5 ? 'auto' : 'none'
  })

  return (
    <group ref={group} position={[x, 0, 0]}>
      {/* the panel, with a slightly darker edge so it reads as a solid board */}
      <mesh material={mats.panel} position={[0, CARD_H / 2, 0]} receiveShadow castShadow>
        <boxGeometry args={[CARD_W, CARD_H, 0.05]} />
      </mesh>
      <mesh material={mats.edge} position={[0, CARD_H / 2, -0.03]}>
        <boxGeometry args={[CARD_W + 0.02, CARD_H + 0.02, 0.02]} />
      </mesh>
      {/* brass horseshoe-arch inlay framing the instrument */}
      <mesh geometry={arch} material={mats.brass} position={[0, 0.62, 0.026]} />
      {/* brass rule above the text */}
      <mesh material={mats.brass} position={[0, 0.6, 0.027]}>
        <boxGeometry args={[CARD_W * 0.8, 0.006, 0.002]} />
      </mesh>
      {/* pedestal */}
      <mesh material={mats.plinth} position={[0, PEDESTAL_TOP - 0.05, 0.16]} castShadow receiveShadow>
        <boxGeometry args={[0.36, 0.1, 0.24]} />
      </mesh>

      {/* the instrument on its pedestal at its own angle; only the model suspends while the GLB loads */}
      <Suspense fallback={null}>
        <group position={[0, PEDESTAL_TOP + 0.71 * PIECE_SCALE, 0.16]}>
          <Turntable hover={hover} pose={POSES[index % POSES.length]} lift={0.03}>
            <group scale={PIECE_SCALE}>
              {/* the model lies along +X: stand it up, neck to the ceiling, skin to the visitor */}
              <group rotation={[0, Math.PI / 2, Math.PI / 2]}>
                <GuembriGLB finish={item.finish} />
              </group>
            </group>
          </Turntable>
        </group>
      </Suspense>

      {/* invisible hit volume over the whole card: hover spins, click opens */}
      <mesh
        material={mats.hit}
        position={[0, CARD_H / 2, 0.2]}
        onPointerOver={(e) => (e.stopPropagation(), setHover(true))}
        onPointerOut={() => setHover(false)}
        onClick={(e) => {
          e.stopPropagation()
          if ((reveal.current ?? 0) > 0.5) onOpen(item.slug, item.name)
        }}
      >
        <boxGeometry args={[CARD_W, CARD_H, 0.4]} />
      </mesh>
    </group>
  )
}

/**
 * The showroom's back wall carries Neo-Tifinagh lettering, like the site's other
 * sections: a few large letters and the word ⴰⵎⴰⵣⵉⵖ (Amaziɣ), a shade darker
 * than the plaster. Drawn once the Tifinagh web font has loaded.
 */
async function tifinaghWall(): Promise<THREE.CanvasTexture> {
  await document.fonts.load('200px "Noto Sans Tifinagh"').catch(() => [])
  const c = document.createElement('canvas')
  c.width = 2048
  c.height = 1024
  const g = c.getContext('2d')!
  g.fillStyle = '#dccaa6'
  g.fillRect(0, 0, 2048, 1024)
  g.fillStyle = 'rgba(120, 92, 52, 0.09)'
  g.textBaseline = 'alphabetic'
  g.font = '620px "Noto Sans Tifinagh"'
  g.fillText('ⵣ', 60, 760)
  g.fillText('ⵙ', 1560, 900)
  g.font = '120px "Noto Sans Tifinagh"'
  g.fillText('ⴰⵎⴰⵣⵉⵖ', 760, 230)
  g.font = '44px "Noto Sans Tifinagh"'
  g.fillText('ⴰ  ⴱ  ⴳ  ⴷ  ⴹ  ⴻ  ⴼ  ⴽ  ⵀ  ⵃ  ⵄ  ⵅ  ⵇ  ⵉ  ⵊ  ⵍ  ⵎ  ⵏ  ⵓ  ⵔ  ⵕ  ⵖ  ⵙ  ⵚ  ⵛ  ⵜ  ⵟ  ⵡ  ⵢ  ⵣ  ⵥ', 120, 980)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  return t
}

export function PortalShowroom({
  items,
  reveal,
  glow,
  labels,
  onOpen,
}: {
  items: ShowpieceItem[]
  /** the three DOM text blocks and their hover flags (owned by PortalSection) */
  labels: CardLabel[]
  /** 0..1, how far the cards' text has faded in */
  reveal: RefObject<number>
  /** 0..1, how far the doors have opened (the room warms up with it) */
  glow: RefObject<number>
  onOpen: (slug: string, name: string) => void
}) {
  const room = useRef<THREE.Group>(null)
  const wall = useRef<THREE.MeshStandardMaterial>(null)
  useEffect(() => {
    let tex: THREE.CanvasTexture | null = null
    let live = true
    void tifinaghWall().then((t) => {
      if (!live || !wall.current) return t.dispose()
      tex = t
      wall.current.map = t
      wall.current.color.set('#ffffff')
      wall.current.needsUpdate = true
    })
    return () => {
      live = false
      tex?.dispose()
    }
  }, [])
  const { camera } = useThree()
  const target = useMemo(() => new THREE.Object3D(), [])
  const key = useRef<THREE.DirectionalLight>(null)
  const fill = useRef<THREE.DirectionalLight>(null)

  useLayoutEffect(() => {
    if (key.current) key.current.target = target
    if (fill.current) fill.current.target = target
  }, [target])

  // keep the set at the distance that fits it from the camera's stopping point
  useFrame(() => {
    const g = room.current
    if (g) g.position.z = STOP_Z - fitDistance(camera as THREE.PerspectiveCamera)
    const l = 0.15 + (glow.current ?? 0) * 0.85
    if (wall.current) wall.current.emissive.setRGB(0.2 * l, 0.15 * l, 0.09 * l)
  })

  return (
    <group ref={room}>
      <primitive object={target} position={[0, 1.2, 0]} />
      {/* back wall of the room, warm plaster with a brass dado line */}
      <mesh position={[0, 4, -1]} receiveShadow>
        <planeGeometry args={[16, 8]} />
        <meshStandardMaterial ref={wall} color="#dccaa6" roughness={0.95} emissive="#000000" />
      </mesh>
      <mesh position={[0, 0.9, -0.99]}>
        <planeGeometry args={[16, 0.012]} />
        <meshStandardMaterial color="#a8875a" metalness={0.6} roughness={0.4} />
      </mesh>
      {items.slice(0, 3).map((it, i) => (
        <Card key={it.slug} item={it} index={i} x={(i - 1) * (CARD_W + GAP)} reveal={reveal} label={labels[i]} onOpen={onOpen} />
      ))}
      {/* gallery light: key from the front and above, a cool fill, and a warm pool over each card */}
      <directionalLight ref={key} position={[1.2, 4.4, 3.2]} intensity={2.2} color="#ffeccc" castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} shadow-normalBias={0.02}>
        <orthographicCamera attach="shadow-camera" args={[-3.4, 3.4, 3.4, -3.4, 0.5, 16]} />
      </directionalLight>
      <directionalLight ref={fill} position={[-3, 1.6, 3.4]} intensity={0.7} color="#eef0e6" />
      {[-1, 0, 1].map((i) => (
        <pointLight key={i} position={[i * (CARD_W + GAP), 3.1, 1.2]} intensity={2.4} distance={4.5} decay={1.6} color="#ffdcae" />
      ))}
      <hemisphereLight args={['#f4ead6', '#8a7350', 0.55]} />
    </group>
  )
}
