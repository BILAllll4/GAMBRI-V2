/**
 * A doorway after the traditional doors of Tiznit (Souss, Morocco).
 *
 * Reference: "Door From 1375 Tiznit" (Anass Sedrati, CC BY-SA 4.0, Wikimedia
 * Commons, Communes Documentation Project — Tiznit), a house door in the medina
 * dated 1375 in its inscription; and the rammed-earth gates of Tiznit's ramparts
 * (Bab Aglou, Bab Ait Jerrar, Kasbah Aguenaj on Commons). Translated here:
 *  - earth-ochre wall with crenellations, as on the ramparts;
 *  - stucco surround in yellow ochre: two pilasters incised as stone blocks,
 *    an impost band, a rectangular frame carved with a geometric lattice band,
 *    a white field, a scalloped (lobed) band round a round-headed arch, two
 *    five-pointed stars in roundels in the spandrels, a cornice slab above;
 *  - a round-headed door of vertical planks in weathered blue paint, covered
 *    with domed nails along its edges and plank joints, a smaller door (wicket)
 *    outlined in nails within one leaf, a nailed motif at mid-height, a ring
 *    knocker and a lock plate.
 * Here the door is split into two leaves so it can swing open onto the showroom.
 * Proportions are adapted to the scene (opening 2.2 m wide), not measured.
 */
import { useLayoutEffect, useMemo, useRef, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { woodTextures } from '../../three/textures'

// doorway dimensions (m)
export const OPEN_W = 2.2
const R = OPEN_W / 2 // round-headed arch
const SPRING = 2.5 // arch centre height
const PIL_W = 0.62 // pilaster width
const FRAME_X = R + PIL_W + 0.14 // half width of the carved frame
const FRAME_Y0 = SPRING + 0.14 // frame starts above the impost band
const FRAME_Y1 = 4.55
const BAND = 0.22 // carved band width
const WALL_TOP = 6.2
const WALL_D = 0.7

/* ------------------------------------------------------------- textures */

function canvasTex(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void, repeat = true) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  draw(c.getContext('2d')!)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.anisotropy = 4
  return t
}

/** rammed earth: mottled ochre with faint horizontal lift lines */
function earthTexture() {
  return canvasTex(512, 512, (g) => {
    g.fillStyle = '#b4895a'
    g.fillRect(0, 0, 512, 512)
    for (let i = 0; i < 2600; i++) {
      const x = Math.random() * 512
      const y = Math.random() * 512
      const r = 2 + Math.random() * 16
      g.fillStyle = `rgba(${Math.random() > 0.5 ? '90,60,32' : '226,190,142'},${0.03 + Math.random() * 0.05})`
      g.beginPath()
      g.ellipse(x, y, r * 1.6, r, 0, 0, Math.PI * 2)
      g.fill()
    }
    g.strokeStyle = 'rgba(80,52,28,.12)'
    for (let y = 40; y < 512; y += 128) {
      g.beginPath()
      g.moveTo(0, y + Math.random() * 4)
      g.lineTo(512, y + Math.random() * 4)
      g.stroke()
    }
  })
}

/** ochre stucco incised as stone blocks (the pilasters) */
function ashlarTexture() {
  return canvasTex(256, 512, (g) => {
    g.fillStyle = '#cf9d47'
    g.fillRect(0, 0, 256, 512)
    g.strokeStyle = 'rgba(60,38,16,.75)'
    g.lineWidth = 3
    const rows = 8
    for (let r = 0; r <= rows; r++) {
      const y = (r / rows) * 512
      g.beginPath()
      g.moveTo(0, y)
      g.lineTo(256, y)
      g.stroke()
      const x = r % 2 ? 96 : 160
      if (r < rows) {
        g.beginPath()
        g.moveTo(x, y)
        g.lineTo(x, y + 512 / rows)
        g.stroke()
      }
    }
    // weathering
    for (let i = 0; i < 500; i++) {
      g.fillStyle = `rgba(255,240,200,${Math.random() * 0.08})`
      g.fillRect(Math.random() * 256, Math.random() * 512, 3, 3)
    }
  })
}

/** the carved lattice band of the frame: staggered recessed squares with lit and shaded edges */
function latticeTexture() {
  return canvasTex(256, 64, (g) => {
    g.fillStyle = '#d4a24a'
    g.fillRect(0, 0, 256, 64)
    const cell = 32
    for (let x = 0; x < 256; x += cell) {
      for (const [y, off] of [
        [8, 0],
        [36, cell / 2],
      ] as const) {
        const cx = x + off
        g.fillStyle = 'rgba(70,44,18,.55)'
        g.fillRect(cx + 6, y + 2, 18, 18)
        g.fillStyle = 'rgba(255,236,190,.55)'
        g.fillRect(cx + 6, y + 18, 18, 3)
        g.fillRect(cx + 22, y + 2, 3, 19)
        g.fillStyle = '#d4a24a'
        g.fillRect(cx + 11, y + 7, 8, 8)
      }
    }
    g.strokeStyle = 'rgba(70,44,18,.6)'
    g.lineWidth = 3
    g.strokeRect(1.5, 1.5, 253, 61)
  })
}

/* ------------------------------------------------------------- geometry */

function archPath(r: number, spring: number, seg = 64) {
  const pts: THREE.Vector2[] = [new THREE.Vector2(-r, 0)]
  for (let i = 0; i <= seg; i++) {
    const a = Math.PI - Math.PI * (i / seg)
    pts.push(new THREE.Vector2(r * Math.cos(a), spring + r * Math.sin(a)))
  }
  pts.push(new THREE.Vector2(r, 0))
  return pts
}

/** scalloped band round the arch: lobed outer edge, plain inner edge */
function scallopGeometry() {
  const lobes = 11
  const outer: THREE.Vector2[] = [new THREE.Vector2(-(R + 0.26), SPRING - 0.02)]
  for (let i = 0; i <= 220; i++) {
    const t = i / 220
    const a = Math.PI - Math.PI * t
    const r = R + 0.16 + 0.1 * Math.abs(Math.sin(t * lobes * Math.PI))
    outer.push(new THREE.Vector2(r * Math.cos(a), SPRING + r * Math.sin(a)))
  }
  outer.push(new THREE.Vector2(R + 0.26, SPRING - 0.02))
  outer.push(new THREE.Vector2(R + 0.02, SPRING - 0.02))
  for (let i = 0; i <= 96; i++) {
    const a = Math.PI * (i / 96)
    outer.push(new THREE.Vector2((R + 0.02) * Math.cos(a), SPRING + (R + 0.02) * Math.sin(a)))
  }
  outer.push(new THREE.Vector2(-(R + 0.02), SPRING - 0.02))
  const s = new THREE.Shape(outer)
  return new THREE.ExtrudeGeometry(s, { depth: 0.05, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 2, curveSegments: 12 })
}

function starShape(r: number) {
  const s = new THREE.Shape()
  for (let i = 0; i <= 10; i++) {
    const a = Math.PI / 2 + (i * Math.PI) / 5
    const rr = i % 2 ? r * 0.4 : r
    const x = Math.cos(a) * rr
    const y = Math.sin(a) * rr
    if (i === 0) s.moveTo(x, y)
    else s.lineTo(x, y)
  }
  return s
}

/** wall with crenellations and a round-headed opening */
function wallGeometry() {
  const W = 12
  const s = new THREE.Shape()
  s.moveTo(-W, 0)
  s.lineTo(W, 0)
  s.lineTo(W, WALL_TOP)
  // merlons along the top, as on Tiznit's ramparts
  const m = 0.62
  for (let x = W; x > -W; x -= m * 2) {
    s.lineTo(x, WALL_TOP + 0.55)
    s.lineTo(x - m, WALL_TOP + 0.55)
    s.lineTo(x - m, WALL_TOP)
    s.lineTo(x - m * 2, WALL_TOP)
  }
  s.lineTo(-W, WALL_TOP)
  s.closePath()
  s.holes.push(new THREE.Path(archPath(R, SPRING)))
  const g = new THREE.ExtrudeGeometry(s, { depth: WALL_D, bevelEnabled: false, curveSegments: 48 })
  g.translate(0, 0, -WALL_D)
  return g
}

/** the white field of the surround, with the arch cut out */
function fieldGeometry() {
  const s = new THREE.Shape()
  s.moveTo(-FRAME_X + BAND, SPRING)
  s.lineTo(-(R + 0.02), SPRING)
  for (let i = 0; i <= 64; i++) {
    const a = Math.PI - Math.PI * (i / 64)
    s.lineTo((R + 0.02) * Math.cos(a), SPRING + (R + 0.02) * Math.sin(a))
  }
  s.lineTo(FRAME_X - BAND, SPRING)
  s.lineTo(FRAME_X - BAND, FRAME_Y1 - BAND)
  s.lineTo(-FRAME_X + BAND, FRAME_Y1 - BAND)
  s.closePath()
  return new THREE.ExtrudeGeometry(s, { depth: 0.03, bevelEnabled: false, curveSegments: 32 })
}

/** one door leaf (half of the round-headed opening), hinge at local x = 0 */
function leafGeometry(side: -1 | 1) {
  const r = R - 0.03
  const s = new THREE.Shape()
  s.moveTo(0, 0)
  // from the hinge jamb up the arch to the crown, then down the meeting edge
  const pts: THREE.Vector2[] = []
  for (let i = 0; i <= 32; i++) {
    const a = Math.PI / 2 + (Math.PI / 2) * (1 - i / 32) // 180°..90° for the left leaf
    pts.push(new THREE.Vector2(r * Math.cos(a), SPRING + r * Math.sin(a)))
  }
  // left leaf spans x in [-r, 0]; shift so the hinge (x = -r) is at 0
  s.lineTo(0, SPRING)
  pts.forEach((p) => s.lineTo(p.x + r, p.y))
  s.lineTo(r, 0)
  s.closePath()
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.09, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008, bevelSegments: 1, curveSegments: 24 })
  g.translate(0, 0, -0.045)
  if (side > 0) g.scale(-1, 1, 1) // mirror for the right leaf (hinge on the right)
  g.computeVertexNormals()
  return { geo: g, width: r }
}

/** domed nails on a leaf, in hinge-local coordinates (x grows toward the meeting edge) */
function nailMatrices(side: -1 | 1, width: number) {
  const out: THREE.Matrix4[] = []
  const put = (x: number, y: number) => out.push(new THREE.Matrix4().makeTranslation(side < 0 ? x : -x, y, 0.05))
  const inside = (x: number, y: number) => {
    if (y <= SPRING) return x > 0.03 && x < width - 0.03
    const dx = x - width // crown at the meeting edge
    return Math.hypot(dx, y - SPRING) < width - 0.06
  }
  // border: along the bottom, the hinge edge, the meeting edge and the arch
  for (let x = 0.07; x < width - 0.04; x += 0.085) put(x, 0.07)
  for (let y = 0.15; y < SPRING; y += 0.085) {
    put(0.07, y)
    put(width - 0.06, y)
  }
  for (let i = 0; i <= 18; i++) {
    const a = Math.PI / 2 + (Math.PI / 2) * (1 - i / 18)
    put((width - 0.08) * Math.cos(a) + width, SPRING + (width - 0.08) * Math.sin(a))
  }
  // plank joints: vertical rows
  for (let x = 0.3; x < width - 0.12; x += 0.27) for (let y = 0.2; y < SPRING + 0.9; y += 0.17) if (inside(x, y)) put(x, y)
  // a nailed lozenge at mid-height
  const cx = width * 0.52
  const cy = 1.75
  for (let k = 0; k < 4; k++) {
    for (let j = 0; j <= 4; j++) {
      const t = j / 4
      const [ax, ay, bx, by] = [
        [cx, cy + 0.32, cx + 0.2, cy],
        [cx + 0.2, cy, cx, cy - 0.32],
        [cx, cy - 0.32, cx - 0.2, cy],
        [cx - 0.2, cy, cx, cy + 0.32],
      ][k]
      put(ax + (bx - ax) * t, ay + (by - ay) * t)
    }
  }
  // the wicket: a smaller round-headed door outlined in nails (right leaf only)
  if (side > 0) {
    const w0 = 0.16
    const w1 = width - 0.12
    const top = 1.55
    const rr = (w1 - w0) / 2
    for (let y = 0.2; y < top; y += 0.1) {
      put(w0, y)
      put(w1, y)
    }
    for (let i = 0; i <= 10; i++) {
      const a = Math.PI * (i / 10)
      put(w0 + rr + rr * Math.cos(a), top + rr * Math.sin(a))
    }
  }
  return out
}

/* ------------------------------------------------------------- component */

export function TiznitDoor({ open }: { open: RefObject<number> }) {
  const leftPivot = useRef<THREE.Group>(null)
  const rightPivot = useRef<THREE.Group>(null)

  const geo = useMemo(() => {
    const left = leafGeometry(-1)
    const right = leafGeometry(1)
    return {
      wall: wallGeometry(),
      field: fieldGeometry(),
      scallop: scallopGeometry(),
      star: new THREE.ExtrudeGeometry(starShape(0.13), { depth: 0.03, bevelEnabled: true, bevelSize: 0.006, bevelThickness: 0.006, bevelSegments: 1 }),
      left,
      right,
      nail: new THREE.SphereGeometry(0.022, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(Math.PI / 2),
      nailsL: nailMatrices(-1, left.width),
      nailsR: nailMatrices(1, right.width),
    }
  }, [])

  const mats = useMemo(() => {
    const earth = earthTexture()
    earth.repeat.set(3, 1.6)
    const ashlar = ashlarTexture()
    const lattice = latticeTexture()
    const latticeH = lattice.clone()
    latticeH.repeat.set((FRAME_X * 2) / 0.9, 1)
    latticeH.needsUpdate = true
    const latticeV = lattice.clone()
    latticeV.center.set(0.5, 0.5)
    latticeV.rotation = Math.PI / 2
    latticeV.repeat.set((FRAME_Y1 - FRAME_Y0) / 0.9, 1)
    latticeV.needsUpdate = true
    // a pale, grey wood under the paint, so the blue reads and the grain still shows
    const wood = woodTextures(512, 47, [0.66, 0.62, 0.56])
    // weathered blue paint over planks: the wood grain shows through the colour
    // DoubleSide: the right leaf is the left one mirrored, which flips its winding
    const leaf = new THREE.MeshStandardMaterial({ ...wood, color: '#8cc0ca', bumpScale: 0.3, roughness: 0.82, side: THREE.DoubleSide })
    // extrude UVs run along x: turn the grain upright so it follows the vertical planks
    for (const t of [leaf.map, leaf.roughnessMap, leaf.bumpMap]) {
      if (!t) continue
      t.center.set(0.5, 0.5)
      t.rotation = Math.PI / 2
      t.repeat.set(0.35, 0.5)
    }
    return {
      wall: new THREE.MeshStandardMaterial({ map: earth, roughness: 0.97 }),
      pilaster: new THREE.MeshStandardMaterial({ map: ashlar, roughness: 0.9 }),
      ochre: new THREE.MeshStandardMaterial({ color: '#d1a04a', roughness: 0.85 }),
      bandH: new THREE.MeshStandardMaterial({ map: latticeH, roughness: 0.85 }),
      bandV: new THREE.MeshStandardMaterial({ map: latticeV, roughness: 0.85 }),
      field: new THREE.MeshStandardMaterial({ color: '#ece2cc', roughness: 0.92 }),
      roundel: new THREE.MeshStandardMaterial({ color: '#a7bba3', roughness: 0.85 }),
      leaf,
      nail: new THREE.MeshStandardMaterial({ color: '#8fc0c9', metalness: 0.35, roughness: 0.5 }),
      iron: new THREE.MeshStandardMaterial({ color: '#2f2e2a', metalness: 0.75, roughness: 0.45 }),
      sill: new THREE.MeshStandardMaterial({ color: '#8f7558', roughness: 0.9 }),
    }
  }, [])

  const nailRefs = [useRef<THREE.InstancedMesh>(null), useRef<THREE.InstancedMesh>(null)]
  useLayoutEffect(() => {
    ;[geo.nailsL, geo.nailsR].forEach((list, i) => {
      const im = nailRefs[i].current
      if (!im) return
      list.forEach((m, k) => im.setMatrixAt(k, m))
      im.instanceMatrix.needsUpdate = true
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo])

  useFrame(() => {
    const o = open.current ?? 0
    if (leftPivot.current) leftPivot.current.rotation.y = o * 1.55
    if (rightPivot.current) rightPivot.current.rotation.y = -o * 1.55
  })

  const z = 0.02 // the surround stands just proud of the wall face
  const pilasterH = SPRING - 0.02
  return (
    <group>
      <mesh geometry={geo.wall} material={mats.wall} receiveShadow />

      {/* pilasters, incised as stone blocks */}
      {[-1, 1].map((s) => (
        <mesh key={s} material={mats.pilaster} position={[s * (R + PIL_W / 2 + 0.02), pilasterH / 2, z + 0.04]} castShadow>
          <boxGeometry args={[PIL_W, pilasterH, 0.08]} />
        </mesh>
      ))}
      {/* impost band across the springing */}
      <mesh material={mats.ochre} position={[0, SPRING + 0.06, z + 0.05]}>
        <boxGeometry args={[FRAME_X * 2 - 0.08, 0.12, 0.11]} />
      </mesh>

      {/* the white field, the carved lattice frame round it, and the cornice */}
      <mesh geometry={geo.field} material={mats.field} position={[0, 0, z]} />
      <mesh material={mats.bandH} position={[0, FRAME_Y1 - BAND / 2, z + 0.04]}>
        <boxGeometry args={[FRAME_X * 2, BAND, 0.08]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} material={mats.bandV} position={[s * (FRAME_X - BAND / 2), (FRAME_Y0 + FRAME_Y1 - BAND) / 2, z + 0.04]}>
          <boxGeometry args={[BAND, FRAME_Y1 - BAND - FRAME_Y0, 0.08]} />
        </mesh>
      ))}
      <mesh material={mats.ochre} position={[0, FRAME_Y1 + 0.32, z + 0.06]} castShadow>
        <boxGeometry args={[FRAME_X * 2 + 0.5, 0.1, 0.14]} />
      </mesh>

      {/* scalloped band round the arch */}
      <mesh geometry={geo.scallop} material={mats.ochre} position={[0, 0, z + 0.03]} castShadow />

      {/* five-pointed stars in roundels, in the spandrels */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * (R + 0.42), SPRING + R - 0.05, z + 0.03]}>
          <mesh material={mats.roundel} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.19, 0.19, 0.03, 40]} />
          </mesh>
          <mesh material={mats.ochre} position={[0, 0, 0.0]} rotation={[0, 0, 0]}>
            <torusGeometry args={[0.19, 0.018, 8, 40]} />
          </mesh>
          <mesh geometry={geo.star} material={mats.ochre} position={[0, 0, 0.01]} />
        </group>
      ))}

      {/* stone sill */}
      <mesh material={mats.sill} position={[0, 0.04, 0.05]} receiveShadow>
        <boxGeometry args={[OPEN_W + 0.5, 0.08, 0.5]} />
      </mesh>

      {/* the two leaves, hinged at the jambs, set back in the wall's depth */}
      <group ref={leftPivot} position={[-R + 0.03, 0, -0.35]}>
        <mesh geometry={geo.left.geo} material={mats.leaf} />
        <instancedMesh ref={nailRefs[0]} args={[geo.nail, mats.nail, geo.nailsL.length]} />
        {/* ring knocker on its boss, near the meeting edge */}
        <group position={[geo.left.width - 0.22, 1.45, 0.06]}>
          <mesh material={mats.iron} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.04, 0.05, 0.03, 20]} />
          </mesh>
          <mesh material={mats.iron} position={[0, -0.09, 0.02]}>
            <torusGeometry args={[0.075, 0.011, 10, 32]} />
          </mesh>
        </group>
      </group>
      <group ref={rightPivot} position={[R - 0.03, 0, -0.35]}>
        <mesh geometry={geo.right.geo} material={mats.leaf} />
        <instancedMesh ref={nailRefs[1]} args={[geo.nail, mats.nail, geo.nailsR.length]} />
        {/* lock plate */}
        <mesh material={mats.iron} position={[-(geo.right.width - 0.2), 1.2, 0.055]}>
          <boxGeometry args={[0.08, 0.16, 0.012]} />
        </mesh>
      </group>
    </group>
  )
}
