/**
 * A Moroccan palace gate (the reference photo the client supplied: a royal
 * gate in the Fes / Meknes manner), built in code:
 *  - green glazed half-round tiles (one instance each) over carved cedar corbels;
 *  - white stucco front, a plinth and plain flanking walls with tile coping;
 *  - three nested zellige bands round the gate (thin blue, wide multicolour,
 *    thin blue), a multicolour zellige field in the spandrels with two eight-
 *    pointed star roundels and a central medallion;
 *  - a horseshoe arch edged with a lobed band of carved stucco, slim columns
 *    with capitals at the jambs;
 *  - two tall leaves of warm cedar carved with an eight-pointed-star pattern;
 *  - a small arched wooden niche on each side.
 *  - on each side a smaller bay (second reference: the full palace front): a
 *    zellige frame, a carved stucco lattice window with three small arches above
 *    a horseshoe arch with closed carved doors, slim columns, cream pilasters;
 *  - beyond, ochre walls set back from the gate, with stepped merlons, a
 *    smaller bay, a green tile awning and a zellige dado;
 *  - all plaster weathers by height (rising damp, splash-back, slow tone shifts).
 * The two central leaves swing open onto the showroom (driven by `open`, 0..1).
 * Proportions are adapted to the scene (opening 2.2 m wide), not measured.
 */
import { useLayoutEffect, useMemo, useRef, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { woodTextures } from '../../three/textures'
import { carvedCedar, plaster, stucco, weather, zellige, type Palette } from './gateTextures'

export const OPEN_W = 2.2
const R = OPEN_W / 2 // half width of the opening at the jambs
const RC = 1.24 // horseshoe circle radius (wider than the jambs)
const SPRING = 2.65 // circle centre height
const D = Math.sqrt(RC * RC - R * R)
const YJ = SPRING - D // where the jambs meet the horseshoe
const RING = 0.26 // carved stucco band round the arch
const FIELD_X = 1.72
const FIELD_TOP = 4.75
const WALL_D = 0.7
const BAY_X = 4.4 // centre of each side bay
const GATE_X = 5.85 // half width of the gate block (centre + two side bays + pilasters)
const GATE_TOP = 6.55
const SIDE_TOP = 5.4

/* ------------------------------------------------------------- geometry */

/** the arc of the horseshoe from the left jamb over the top to the right jamb */
function horseshoeArc(r: number, rc: number, seg = 72, spring = SPRING) {
  const d = Math.sqrt(rc * rc - r * r)
  const start = Math.PI + Math.asin(d / rc) // below horizontal, left
  const end = -Math.asin(d / rc) // below horizontal, right
  const out: THREE.Vector2[] = []
  for (let i = 0; i <= seg; i++) {
    const a = start + (end - start) * (i / seg) // decreasing angle: left → top → right
    out.push(new THREE.Vector2(rc * Math.cos(a), spring + rc * Math.sin(a)))
  }
  return out
}

function openingPath(inset = 0) {
  const r = R - inset
  const rc = RC - inset
  const d = Math.sqrt(rc * rc - r * r)
  const pts = [new THREE.Vector2(-r, 0), new THREE.Vector2(-r, SPRING - d), ...horseshoeArc(r, rc), new THREE.Vector2(r, SPRING - d), new THREE.Vector2(r, 0)]
  return pts
}

function extrude(shape: THREE.Shape, depth: number, bevel = 0) {
  return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 1, curveSegments: 48 })
}

function rectShape(x0: number, y0: number, x1: number, y1: number) {
  const s = new THREE.Shape()
  s.moveTo(x0, y0)
  s.lineTo(x1, y0)
  s.lineTo(x1, y1)
  s.lineTo(x0, y1)
  s.closePath()
  return s
}

/** a rectangular frame band: outer rect minus inner rect, open at the bottom (down to y0) */
function bandShape(xIn: number, xOut: number, topIn: number, topOut: number, y0: number) {
  const s = new THREE.Shape()
  s.moveTo(-xOut, y0)
  s.lineTo(-xOut, topOut)
  s.lineTo(xOut, topOut)
  s.lineTo(xOut, y0)
  s.lineTo(xIn, y0)
  s.lineTo(xIn, topIn)
  s.lineTo(-xIn, topIn)
  s.lineTo(-xIn, y0)
  s.closePath()
  return s
}

const SIDE_SET = 0.28 // the side walls stand this far behind the face of the gate block
const WALL_END = 12

/** the gate block: a plain front with the horseshoe opening */
function gateWallGeometry() {
  const s = rectShape(-GATE_X, 0, GATE_X, GATE_TOP)
  s.holes.push(new THREE.Path(openingPath()))
  const g = extrude(s, WALL_D)
  g.translate(0, 0, -WALL_D)
  return g
}

/** one side wall (x from GATE_X to WALL_END), with stepped Moroccan merlons along the top */
function sideWallGeometry(side: 1 | -1) {
  // mirrored by its points (not by a negative scale, which would flip the normals and darken it)
  const s = new THREE.Shape()
  const lineTo = s.lineTo.bind(s)
  s.lineTo = (x: number, y: number) => lineTo(side * x, y)
  const moveTo = s.moveTo.bind(s)
  s.moveTo = (x: number, y: number) => moveTo(side * x, y)
  const m = 0.46 // merlon width
  const gap = 0.3
  s.moveTo(GATE_X - 0.01, 0)
  s.lineTo(WALL_END, 0)
  s.lineTo(WALL_END, SIDE_TOP)
  // walk back towards the gate drawing each stepped merlon (three steps and a point)
  for (let x = WALL_END - 0.15; x - m > GATE_X + 0.1; x -= m + gap) {
    const steps = [
      [0, 0.2],
      [0.08, 0.16],
      [0.16, 0.12],
    ]
    s.lineTo(x, SIDE_TOP)
    let y = SIDE_TOP
    for (const [inset, rise] of steps) {
      s.lineTo(x - inset, y)
      y += rise
      s.lineTo(x - inset, y)
    }
    s.lineTo(x - m / 2, y + 0.1)
    for (const [inset, rise] of [...steps].reverse()) {
      s.lineTo(x - m + inset, y)
      y -= rise
      s.lineTo(x - m + inset, y)
    }
    s.lineTo(x - m, SIDE_TOP)
  }
  s.lineTo(GATE_X - 0.01, SIDE_TOP)
  s.closePath()
  const g = extrude(s, WALL_D)
  g.translate(0, 0, -WALL_D - SIDE_SET)
  return g
}

/** the zellige spandrel field with the arch (and its ring) cut out */
function fieldGeometry() {
  const s = rectShape(-FIELD_X, YJ - 0.1, FIELD_X, FIELD_TOP)
  const r = R + RING
  const rc = RC + RING
  const d = Math.sqrt(rc * rc - r * r)
  s.holes.push(new THREE.Path([new THREE.Vector2(-r, YJ - 0.1), new THREE.Vector2(-r, SPRING - d), ...horseshoeArc(r, rc), new THREE.Vector2(r, SPRING - d), new THREE.Vector2(r, YJ - 0.1)].reverse()))
  return extrude(s, 0.02)
}

/** the carved stucco ring round the arch, lobed on its outer edge */
function ringGeometry() {
  const lobes = 23
  const outer: THREE.Vector2[] = []
  const d0 = Math.sqrt(RC * RC - R * R)
  const start = Math.PI + Math.asin(d0 / RC)
  const end = -Math.asin(d0 / RC)
  const N = 320
  for (let i = 0; i <= N; i++) {
    const t = i / N
    const a = start + (end - start) * t
    const rr = RC + RING - 0.05 + 0.05 * Math.abs(Math.sin(t * lobes * Math.PI))
    outer.push(new THREE.Vector2(rr * Math.cos(a), SPRING + rr * Math.sin(a)))
  }
  const inner = horseshoeArc(R, RC, 96).reverse()
  const s = new THREE.Shape([new THREE.Vector2(-(R + RING), YJ - 0.02), ...outer, new THREE.Vector2(R + RING, YJ - 0.02), new THREE.Vector2(R, YJ - 0.02), ...inner, new THREE.Vector2(-R, YJ - 0.02)])
  return extrude(s, 0.05, 0.01)
}

/** one door leaf (left half of the horseshoe), hinge at local x = 0 */
function leafGeometry(side: -1 | 1) {
  const inset = 0.03
  const r = R - inset
  const rc = RC - inset
  const d = Math.sqrt(rc * rc - r * r)
  const arc = horseshoeArc(r, rc, 96)
  const half = arc.filter((p) => p.x <= 0)
  const pts = [new THREE.Vector2(-r, 0), new THREE.Vector2(-r, SPRING - d), ...half, new THREE.Vector2(0, SPRING + rc), new THREE.Vector2(0, 0)]
  const s = new THREE.Shape(pts.map((p) => new THREE.Vector2(p.x + r, p.y)))
  const g = extrude(s, 0.1, 0.01)
  g.translate(0, 0, -0.05)
  if (side > 0) g.scale(-1, 1, 1)
  g.computeVertexNormals()
  return { geo: g, width: r }
}

/** a small arched niche (wooden panel in a horseshoe frame) */
function nicheGeometry(w: number, h: number) {
  const r = w / 2
  const s = new THREE.Shape()
  s.moveTo(-r, 0)
  s.lineTo(-r, h - r)
  s.absarc(0, h - r, r, Math.PI, 0, true)
  s.lineTo(r, 0)
  s.closePath()
  return extrude(s, 0.04)
}

function starShape(r: number) {
  const s = new THREE.Shape()
  for (let i = 0; i < 16; i++) {
    const a = (i * Math.PI) / 8 - Math.PI / 8
    const rr = i % 2 ? r * 0.72 : r
    if (i) s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr)
    else s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr)
  }
  s.closePath()
  return s
}

/* ------------------------------------------------------------- roof and frieze */

/**
 * Glazed half-round tiles laid in runs down a slope. Local frame: x along the
 * eave, y up the slope, z out of the roof. Each tile is its own instance with a
 * slightly different glaze, laid in overlapping courses.
 */
function TileRoof({ width, length, mat, under }: { width: number; length: number; mat: THREE.Material; under: THREE.Material }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const step = 0.15
  const course = 0.3
  const runs = Math.floor(width / step)
  const per = Math.max(1, Math.round(length / course))
  const geo = useMemo(() => new THREE.CylinderGeometry(0.066, 0.074, course + 0.06, 12, 1, true, -Math.PI / 2, Math.PI), [])
  const cap = useMemo(() => new THREE.CircleGeometry(0.074, 12, 0, Math.PI).rotateX(Math.PI / 2).rotateY(Math.PI), [])
  useLayoutEffect(() => {
    const im = ref.current
    if (!im) return
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.06, 0, 0))
    const c = new THREE.Color()
    let k = 0
    let seed = 5
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    for (let i = 0; i < runs; i++)
      for (let j = 0; j < per; j++) {
        const x = -width / 2 + step / 2 + i * step
        const y = -length / 2 + course / 2 + j * course
        m.compose(new THREE.Vector3(x, y, 0.01 + j * 0.004), q, new THREE.Vector3(1, 1, 0.85 + rand() * 0.2))
        im.setMatrixAt(k, m)
        im.setColorAt(k, c.setHSL(0.4 + rand() * 0.025, 0.7 + rand() * 0.15, 0.1 + rand() * 0.06))
        k++
      }
    im.instanceMatrix.needsUpdate = true
    if (im.instanceColor) im.instanceColor.needsUpdate = true
  }, [runs, per, width, length])
  return (
    <group>
      <mesh material={under} position={[0, 0, -0.03]}>
        <boxGeometry args={[width, length, 0.04]} />
      </mesh>
      <instancedMesh ref={ref} args={[geo, mat, runs * per]} castShadow receiveShadow />
      {/* ridge */}
      <mesh material={under} position={[0, length / 2, 0.05]}>
        <boxGeometry args={[width, 0.12, 0.14]} />
      </mesh>
      {/* the open ends of the tiles along the eave catch a dark shadow */}
      <instancedMesh
        args={[cap, under, runs]}
        ref={(im) => {
          if (!im) return
          const m = new THREE.Matrix4()
          for (let i = 0; i < runs; i++) im.setMatrixAt(i, m.makeTranslation(-width / 2 + step / 2 + i * step, -length / 2 - 0.02, 0.012))
          im.instanceMatrix.needsUpdate = true
        }}
      />
    </group>
  )
}

/** carved cedar eaves: a beam over a row of corbels (modillions) set against a shadowed back */
function Corbels({ width, height, wood, dark }: { width: number; height: number; wood: THREE.Material; dark: THREE.Material }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const pitch = 0.3
  const n = Math.floor(width / pitch)
  const geo = useMemo(() => {
    // side profile: deep at the top, curling back to the wall at the bottom
    const sh = new THREE.Shape()
    sh.moveTo(0, 0)
    sh.lineTo(0, height)
    sh.lineTo(0.34, height)
    sh.lineTo(0.34, height * 0.82)
    sh.bezierCurveTo(0.22, height * 0.78, 0.26, height * 0.45, 0.16, height * 0.34)
    sh.bezierCurveTo(0.08, height * 0.25, 0.14, height * 0.05, 0.06, 0)
    sh.closePath()
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.11, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008, bevelSegments: 2, curveSegments: 12 })
    g.rotateY(-Math.PI / 2)
    g.translate(0.055, 0, 0)
    return g
  }, [height])
  useLayoutEffect(() => {
    const im = ref.current
    if (!im) return
    const m = new THREE.Matrix4()
    for (let i = 0; i < n; i++) im.setMatrixAt(i, m.makeTranslation(-width / 2 + pitch / 2 + i * pitch, 0, 0))
    im.instanceMatrix.needsUpdate = true
  }, [n, width])
  return (
    <group>
      {/* the shadowed back between the corbels, carved in small panels */}
      <mesh material={dark} position={[0, height / 2, 0.02]}>
        <boxGeometry args={[width, height, 0.04]} />
      </mesh>
      <instancedMesh ref={ref} args={[geo, wood, n]} castShadow receiveShadow />
      {/* moulded beams: one carried by the corbels, one thin fillet under them */}
      <mesh material={wood} position={[0, height + 0.08, 0.2]} castShadow>
        <boxGeometry args={[width + 0.1, 0.16, 0.42]} />
      </mesh>
      <mesh material={wood} position={[0, height + 0.2, 0.26]} castShadow>
        <boxGeometry args={[width + 0.2, 0.08, 0.5]} />
      </mesh>
      <mesh material={wood} position={[0, -0.03, 0.07]}>
        <boxGeometry args={[width, 0.06, 0.12]} />
      </mesh>
    </group>
  )
}

/* ------------------------------------------------------------- side bay */

const BAY_SPRING = 2.3
const BR = 0.55
const BRC = 0.62

/** horseshoe panel (closed door) for a side bay */
function bayArchShape(r: number, rc: number, base = 0) {
  const d = Math.sqrt(rc * rc - r * r)
  return new THREE.Shape([new THREE.Vector2(-r, base), new THREE.Vector2(-r, BAY_SPRING - d), ...horseshoeArc(r, rc, 64, BAY_SPRING), new THREE.Vector2(r, BAY_SPRING - d), new THREE.Vector2(r, base)])
}

function bayRing() {
  const r0 = BR
  const rc0 = BRC
  const w = 0.12
  const d0 = Math.sqrt(rc0 * rc0 - r0 * r0)
  const start = Math.PI + Math.asin(d0 / rc0)
  const end = -Math.asin(d0 / rc0)
  const outer: THREE.Vector2[] = []
  const N = 200
  for (let i = 0; i <= N; i++) {
    const t = i / N
    const a = start + (end - start) * t
    const rr = rc0 + w - 0.03 + 0.03 * Math.abs(Math.sin(t * 15 * Math.PI))
    outer.push(new THREE.Vector2(rr * Math.cos(a), BAY_SPRING + rr * Math.sin(a)))
  }
  const y0 = BAY_SPRING - d0
  const inner = horseshoeArc(r0, rc0, 64, BAY_SPRING).reverse()
  return extrude(new THREE.Shape([new THREE.Vector2(-(r0 + w), y0), ...outer, new THREE.Vector2(r0 + w, y0), new THREE.Vector2(r0, y0), ...inner, new THREE.Vector2(-r0, y0)]), 0.04, 0.008)
}

/** one side bay, centred on x = 0 (placed at ±BAY_X) */
function SideBay({ mats }: { mats: Record<string, THREE.Material> }) {
  const geo = useMemo(() => {
    const field = rectShape(-0.86, 1.55, 0.86, 3.35)
    const d = Math.sqrt((BRC + 0.12) ** 2 - (BR + 0.12) ** 2)
    field.holes.push(new THREE.Path([new THREE.Vector2(-(BR + 0.12), 1.55), new THREE.Vector2(-(BR + 0.12), BAY_SPRING - d), ...horseshoeArc(BR + 0.12, BRC + 0.12, 64, BAY_SPRING), new THREE.Vector2(BR + 0.12, BAY_SPRING - d), new THREE.Vector2(BR + 0.12, 1.55)].reverse()))
    const lattice = rectShape(-0.86, 3.55, 0.86, 5.5)
    const smallArch = (cx: number) => {
      const a = new THREE.Shape()
      a.moveTo(cx - 0.16, 3.7)
      a.lineTo(cx - 0.16, 4.3)
      a.absarc(cx, 4.3, 0.16, Math.PI, 0, true)
      a.lineTo(cx + 0.16, 3.7)
      a.closePath()
      return a
    }
    return {
      band: extrude(bandShape(0.92, 1.08, 5.62, 5.78, 0.32), 0.03),
      field: extrude(field, 0.02),
      lattice: extrude(lattice, 0.02),
      arches: [-0.5, 0, 0.5].map((x) => extrude(smallArch(x), 0.03)),
      door: extrude(bayArchShape(BR - 0.02, BRC - 0.02), 0.06, 0.008),
      ring: bayRing(),
      sep: new THREE.BoxGeometry(1.84, 0.12, 0.06),
    }
  }, [])
  return (
    <group>
      <mesh geometry={geo.band} material={mats.bandBlue} position={[0, 0, 0.012]} />
      <mesh geometry={geo.field} material={mats.bandMulti} position={[0, 0, 0.012]} />
      <mesh geometry={geo.lattice} material={mats.lattice} position={[0, 0, 0.012]} />
      {geo.arches.map((g, i) => (
        <mesh key={i} geometry={g} material={mats.field} position={[0, 0, 0.03]} />
      ))}
      <mesh geometry={geo.sep} material={mats.plinth} position={[0, 3.45, 0.04]} />
      <mesh geometry={geo.ring} material={mats.stucco} position={[0, 0, 0.03]} />
      <mesh geometry={geo.door} material={mats.niche} position={[0, 0, 0.0]} />
      {/* the meeting line and two ring handles of the closed doors */}
      <mesh material={mats.iron} position={[0, 1.4, 0.075]}>
        <boxGeometry args={[0.012, 2.6, 0.01]} />
      </mesh>
      {[-1, 1].map((k) => (
        <mesh key={k} material={mats.gold} position={[k * 0.08, 1.3, 0.085]}>
          <torusGeometry args={[0.035, 0.007, 8, 24]} />
        </mesh>
      ))}
      {[-1, 1].map((k) => (
        <group key={k} position={[k * 0.74, 0, 0.08]}>
          <mesh material={mats.plinth} position={[0, 0.42, 0]}>
            <boxGeometry args={[0.13, 0.2, 0.13]} />
          </mesh>
          <mesh material={mats.wall} position={[0, 1.0, 0]}>
            <cylinderGeometry args={[0.04, 0.045, 1.0, 16]} />
          </mesh>
          <mesh material={mats.stucco} position={[0, 1.56, 0]}>
            <boxGeometry args={[0.16, 0.12, 0.15]} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/* ------------------------------------------------------------- component */

export function PalaceGate({ open }: { open: RefObject<number> }) {
  const leftPivot = useRef<THREE.Group>(null)
  const rightPivot = useRef<THREE.Group>(null)

  const geo = useMemo(
    () => ({
      wall: gateWallGeometry(),
      sideWallR: sideWallGeometry(1),
      sideWallL: sideWallGeometry(-1),
      field: fieldGeometry(),
      ring: ringGeometry(),
      left: leafGeometry(-1),
      right: leafGeometry(1),
      bandA: extrude(bandShape(FIELD_X, FIELD_X + 0.18, FIELD_TOP, FIELD_TOP + 0.18, 0.32), 0.03),
      bandB: extrude(bandShape(2.08, 2.5, FIELD_TOP + 0.36, FIELD_TOP + 0.78, 1.62), 0.03),
      bandC: extrude(bandShape(2.68, 2.88, FIELD_TOP + 0.96, FIELD_TOP + 1.16, 0.32), 0.03),
      niche: nicheGeometry(0.38, 1.18),
      nicheFrame: nicheGeometry(0.48, 1.26),
      star: extrude(starShape(0.2), 0.025, 0.005),
      starSmall: extrude(starShape(0.12), 0.025, 0.005),
    }),
    [],
  )

  const mats = useMemo(() => {
    const palBlue: Palette = { ground: '#f2ede2', star: '#1d4a94', inner: '#f2ede2', points: ['#1d4a94', '#24704a', '#1d4a94'], line: '#161616' }
    const palMulti: Palette = { ground: '#f3ecdd', star: '#b8362a', inner: '#e3aa36', points: ['#1f58a3', '#2a7f49', '#e3aa36', '#1f58a3'], line: '#141414' }
    const palField: Palette = { ground: '#efe6d2', star: '#2a69ae', inner: '#bf3c2c', points: ['#2a7f49', '#dca336', '#bf3c2c', '#5793c8'], line: '#151515' }
    // glazed tile: the roughness map makes the glaze glossy and the grout matt; a clear coat adds the sheen of the glaze
    const tile = (t: ReturnType<typeof zellige>) => new THREE.MeshStandardMaterial({ ...t, roughness: 1, bumpScale: 1.2, envMapIntensity: 0.6 })
    const dado = zellige(palField, 1, 9)
    for (const t of [dado.map, dado.bumpMap, dado.roughnessMap]) t.repeat.set(3.4 / 0.22, 1.3 / 0.22)
    const cedar = carvedCedar(0.55)
    const cedarSmall = carvedCedar(0.3, 13)
    const plain = woodTextures(512, 19, [0.36, 0.2, 0.1])
    return {
      wall: weather(new THREE.MeshStandardMaterial({ ...plaster(1.6), roughness: 1, bumpScale: 1.4 })),
      // the walls beside the gate: warm ochre lime, as on the reference
      sideWall: weather(new THREE.MeshStandardMaterial({ ...plaster(1.8, '#d9b98c', 41), roughness: 1, bumpScale: 1.6 }), 1.2),
      plinth: weather(new THREE.MeshStandardMaterial({ ...plaster(0.9, '#d6c8aa', 31), roughness: 1, bumpScale: 1.8 }), 1.3),
      bandBlue: tile(zellige(palBlue, 0.15, 3)),
      bandMulti: tile(zellige(palMulti, 0.32, 5)),
      field: tile(zellige(palField, 0.28, 9)),
      dado: tile(dado),
      stucco: weather(new THREE.MeshStandardMaterial({ ...stucco(0.12), roughness: 1, bumpScale: 2.5 }), 0.6),
      lattice: new THREE.MeshStandardMaterial({ ...stucco(0.09), roughness: 1, bumpScale: 2.5 }),
      iron: new THREE.MeshStandardMaterial({ color: '#2a1a10', roughness: 0.6 }),
      // DoubleSide: the right leaf is the left one mirrored, which flips its winding
      leaf: new THREE.MeshStandardMaterial({ ...cedar, roughness: 1, bumpScale: 3, side: THREE.DoubleSide }),
      niche: new THREE.MeshStandardMaterial({ ...cedarSmall, roughness: 1, bumpScale: 2.5 }),
      roof: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.28, envMapIntensity: 0.7, side: THREE.DoubleSide }),
      roofUnder: new THREE.MeshStandardMaterial({ color: '#0e2a1c', roughness: 0.8 }),
      cedarPlain: new THREE.MeshStandardMaterial({ ...plain, bumpScale: 1.2 }),
      cedarDark: new THREE.MeshStandardMaterial({ color: '#3a1d0c', roughness: 0.85 }),
      blueRoundel: new THREE.MeshStandardMaterial({ color: '#1d4a94', roughness: 0.25 }),
      gold: new THREE.MeshStandardMaterial({ color: '#c9973a', roughness: 0.35, metalness: 0.7 }),
      red: new THREE.MeshStandardMaterial({ color: '#b3342a', roughness: 0.25 }),
      sill: weather(new THREE.MeshStandardMaterial({ ...plaster(0.6, '#a99c86', 53), roughness: 1, bumpScale: 2.5 }), 1.4),
    }
  }, [])

  // every part of the gate casts and receives shadows
  const rootRef = useRef<THREE.Group>(null)
  useLayoutEffect(() => {
    rootRef.current?.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        o.castShadow = true
        o.receiveShadow = true
      }
    })
  }, [])

  useFrame(() => {
    const o = open.current ?? 0
    if (leftPivot.current) leftPivot.current.rotation.y = o * 1.55
    if (rightPivot.current) rightPivot.current.rotation.y = -o * 1.55
  })

  const z = 0.01
  const colX = R + 0.13
  const roofW = GATE_X * 2 + 0.6
  return (
    <group ref={rootRef}>
      <mesh geometry={geo.wall} material={mats.wall} receiveShadow />
      <mesh geometry={geo.sideWallR} material={mats.sideWall} receiveShadow />
      <mesh geometry={geo.sideWallL} material={mats.sideWall} receiveShadow />

      {/* plinth along the base */}
      <mesh material={mats.plinth} position={[0, 0.16, 0.03]}>
        <boxGeometry args={[GATE_X * 2, 0.32, 0.06]} />
      </mesh>
      {[-1, 1].map((k) => (
        <mesh key={k} material={mats.plinth} position={[k * (GATE_X + (WALL_END - GATE_X) / 2), 0.14, 0.03 - SIDE_SET]}>
          <boxGeometry args={[WALL_END - GATE_X, 0.28, 0.06]} />
        </mesh>
      ))}

      {/* the three zellige bands and the spandrel field */}
      <mesh geometry={geo.bandA} material={mats.bandBlue} position={[0, 0, z]} />
      <mesh geometry={geo.bandB} material={mats.bandMulti} position={[0, 0, z]} />
      <mesh geometry={geo.bandC} material={mats.bandBlue} position={[0, 0, z]} />
      <mesh geometry={geo.field} material={mats.field} position={[0, 0, z]} />

      {/* carved stucco ring round the horseshoe arch */}
      <mesh geometry={geo.ring} material={mats.stucco} position={[0, 0, z + 0.01]} castShadow />

      {/* star roundels in the spandrels and a medallion over the crown */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 1.3, 4.3, z + 0.025]}>
          <mesh material={mats.blueRoundel} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.27, 0.27, 0.02, 48]} />
          </mesh>
          <mesh material={mats.gold}>
            <torusGeometry args={[0.27, 0.02, 8, 48]} />
          </mesh>
          <mesh geometry={geo.star} material={mats.red} position={[0, 0, 0.005]} />
          <mesh geometry={geo.starSmall} material={mats.gold} position={[0, 0, 0.02]} rotation={[0, 0, Math.PI / 8]} />
        </group>
      ))}
      <group position={[0, 4.46, z + 0.025]}>
        <mesh material={mats.blueRoundel} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.16, 0.16, 0.02, 40]} />
        </mesh>
        <mesh material={mats.gold}>
          <torusGeometry args={[0.16, 0.016, 8, 40]} />
        </mesh>
        <mesh geometry={geo.starSmall} material={mats.gold} position={[0, 0, 0.005]} scale={0.9} />
      </group>

      {/* slim columns with capitals at the jambs */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * colX, 0, 0.08]}>
          <mesh material={mats.plinth} position={[0, 0.42, 0]}>
            <boxGeometry args={[0.16, 0.2, 0.16]} />
          </mesh>
          <mesh material={mats.wall} position={[0, (0.52 + YJ - 0.18) / 2, 0]}>
            <cylinderGeometry args={[0.05, 0.055, YJ - 0.18 - 0.52, 20]} />
          </mesh>
          <mesh material={mats.stucco} position={[0, YJ - 0.1, 0]}>
            <boxGeometry args={[0.2, 0.16, 0.18]} />
          </mesh>
        </group>
      ))}

      {/* small arched wooden niches at the sides */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 2.29, 0.34, z]}>
          <mesh geometry={geo.nicheFrame} material={mats.stucco} position={[0, -0.04, 0]} />
          <mesh geometry={geo.niche} material={mats.niche} position={[0, 0, 0.015]} />
        </group>
      ))}

      {/* cornice, carved cedar frieze and the green tile roof of the gate block */}
      <mesh material={mats.plinth} position={[0, GATE_TOP - 0.05, 0.08]}>
        <boxGeometry args={[GATE_X * 2 + 0.2, 0.1, 0.16]} />
      </mesh>
      <group position={[0, GATE_TOP, 0]}>
        <Corbels width={roofW} height={0.5} wood={mats.cedarPlain} dark={mats.cedarDark} />
      </group>
      <group position={[0, GATE_TOP + 1.12, 0.12]} rotation={[-0.62, 0, 0]}>
        <TileRoof width={roofW + 0.3} length={1.0} mat={mats.roof} under={mats.roofUnder} />
      </group>

      {/* the two side bays and the cream pilasters between the bays */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * BAY_X, 0, 0]}>
          <SideBay mats={mats} />
        </group>
      ))}
      {[-3.12, -5.68, 3.12, 5.68].map((x) => (
        <group key={x} position={[x, 0, 0.06]}>
          <mesh material={mats.wall} position={[0, GATE_TOP / 2, 0]}>
            <boxGeometry args={[0.34, GATE_TOP, 0.12]} />
          </mesh>
          <mesh material={mats.plinth} position={[0, 0.25, 0.01]}>
            <boxGeometry args={[0.4, 0.5, 0.14]} />
          </mesh>
          <mesh material={mats.plinth} position={[0, 3.45, 0.01]}>
            <boxGeometry args={[0.4, 0.14, 0.14]} />
          </mesh>
        </group>
      ))}

      {/* beyond the gate (set back with the side walls): a smaller bay between pilasters, a tiled awning on corbels, a zellige dado */}
      {[-1, 1].map((k) => (
        <group key={k} position={[0, 0, -SIDE_SET]}>
          {[6.1, 8.45].map((x) => (
            <group key={x} position={[k * x, 0, 0.06]}>
              <mesh material={mats.sideWall} position={[0, 2.1, 0]}>
                <boxGeometry args={[0.3, 4.2, 0.12]} />
              </mesh>
              <mesh material={mats.plinth} position={[0, 0.25, 0.01]}>
                <boxGeometry args={[0.36, 0.5, 0.14]} />
              </mesh>
            </group>
          ))}
          <group position={[k * 7.27, 0, 0]} scale={0.72}>
            <SideBay mats={mats} />
          </group>
          <group position={[k * (GATE_X + 3.1), 4.3, 0]}>
            <Corbels width={6.2} height={0.24} wood={mats.cedarPlain} dark={mats.cedarDark} />
          </group>
          <group position={[k * (GATE_X + 3.1), 4.8, 0.3]} rotation={[-0.75, 0, 0]}>
            <TileRoof width={6.2} length={0.6} mat={mats.roof} under={mats.roofUnder} />
          </group>
          <mesh material={mats.dado} position={[k * 10.3, 0.95, 0.02]}>
            <boxGeometry args={[3.4, 1.3, 0.02]} />
          </mesh>
        </group>
      ))}

      {/* stone sill */}
      <mesh material={mats.sill} position={[0, 0.04, 0.05]} receiveShadow>
        <boxGeometry args={[OPEN_W + 0.5, 0.08, 0.5]} />
      </mesh>

      {/* the two carved cedar leaves, hinged at the jambs, set back in the wall */}
      <group ref={leftPivot} position={[-R + 0.03, 0, -0.35]}>
        <mesh geometry={geo.left.geo} material={mats.leaf} castShadow />
      </group>
      <group ref={rightPivot} position={[R - 0.03, 0, -0.35]}>
        <mesh geometry={geo.right.geo} material={mats.leaf} castShadow />
      </group>
    </group>
  )
}
