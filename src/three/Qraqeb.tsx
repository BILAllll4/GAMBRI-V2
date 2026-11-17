/**
 * Procedural qraqeb: each hand holds two iron plates shaped like a figure of
 * eight (two cupped lobes joined by a narrow waist), linked at one end by a
 * leather loop. Proportions are illustrative, not measured from a specific pair.
 */
import { useMemo } from 'react'
import * as THREE from 'three'
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { cordTextures } from './textures'

const LOBE_R = 0.05
const LOBE_C = 0.095 // lobe centre distance from the middle
const WAIST = 0.011

function plateGeometry() {
  const n = 90
  const top: THREE.Vector2[] = []
  const x0 = -(LOBE_C + LOBE_R)
  const x1 = LOBE_C + LOBE_R
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n
    let y = Math.abs(x) < LOBE_C ? WAIST : 0
    for (const c of [-LOBE_C, LOBE_C]) {
      const d = x - c
      if (Math.abs(d) <= LOBE_R) y = Math.max(y, Math.sqrt(LOBE_R * LOBE_R - d * d))
    }
    top.push(new THREE.Vector2(x, Math.max(y, 0.0005)))
  }
  const shape = new THREE.Shape()
  top.forEach((p, i) => (i ? shape.lineTo(p.x, p.y) : shape.moveTo(p.x, p.y)))
  for (let i = top.length - 1; i >= 0; i--) shape.lineTo(top[i].x, -top[i].y)
  shape.closePath()
  // the lobes are open here; dished cups (below) fill them
  for (const c of [-LOBE_C, LOBE_C]) {
    const h = new THREE.Path()
    h.absarc(c, 0, LOBE_R * 0.97, 0, Math.PI * 2, true)
    shape.holes.push(h)
  }
  let geo: THREE.BufferGeometry = new THREE.ExtrudeGeometry(shape, { depth: 0.0028, bevelEnabled: true, bevelSize: 0.0012, bevelThickness: 0.0012, bevelSegments: 2, curveSegments: 4, steps: 1 })
  geo = mergeVertices(geo, 1e-6)
  geo.computeVertexNormals()
  return geo
}

/** a dished cup filling each lobe (dense radial grid so the curvature reads) */
function lobeDishGeometry() {
  const seg = new THREE.RingGeometry(0.0001, LOBE_R * 0.975, 48, 10)
  const pos = seg.attributes.position as THREE.BufferAttribute
  for (let i = 0; i < pos.count; i++) {
    const d2 = pos.getX(i) ** 2 + pos.getY(i) ** 2
    pos.setZ(i, -(1 - d2 / (LOBE_R * LOBE_R)) * 0.012 + 0.0014)
  }
  seg.computeVertexNormals()
  return seg
}

export type QraqebFinish = 'iron' | 'polished'

export function QraqebPair({
  position = [0, 0, 0] as [number, number, number],
  rotation = [0, 0, 0] as [number, number, number],
  finish = 'iron' as QraqebFinish,
}) {
  const { plate, dish, iron, leather } = useMemo(() => {
    const cord = cordTextures(5)
    return {
      plate: plateGeometry(),
      dish: lobeDishGeometry(),
      iron: new THREE.MeshPhysicalMaterial({ color: finish === 'polished' ? '#e4e0d6' : '#8d877b', metalness: finish === 'polished' ? 0.7 : 0.85, roughness: finish === 'polished' ? 0.3 : 0.36, clearcoat: 0.2, clearcoatRoughness: 0.6, side: THREE.DoubleSide }),
      leather: new THREE.MeshStandardMaterial({ map: cord.map, bumpMap: cord.bumpMap, bumpScale: 2, roughness: 0.8, color: '#8a5a3a' }),
    }
  }, [finish])

  const plateMesh = (flip: boolean) => (
    <group rotation={[flip ? Math.PI : 0, 0, 0]}>
      <mesh geometry={plate} material={iron} castShadow receiveShadow />
      {[-LOBE_C, LOBE_C].map((c) => (
        <mesh key={c} geometry={dish} material={iron} position={[c, 0, 0]} castShadow />
      ))}
    </group>
  )

  // two plates, cups facing each other, hinged open slightly at the far end
  return (
    <group position={position} rotation={rotation}>
      <group position={[LOBE_C + LOBE_R, 0, 0]}>
        <group rotation={[0, 0.035, 0]} position={[-(LOBE_C + LOBE_R), 0, 0.0045]}>
          {plateMesh(false)}
        </group>
        <group rotation={[0, -0.035, 0]} position={[-(LOBE_C + LOBE_R), 0, -0.0045]}>
          {plateMesh(true)}
        </group>
        {/* leather loop through both plates */}
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[-0.03, 0, 0]} material={leather} castShadow>
          <torusGeometry args={[0.014, 0.0035, 10, 32]} />
        </mesh>
      </group>
    </group>
  )
}

export function Qraqeb({ pairs = 1, finish = 'iron' }: { pairs?: 1 | 2; finish?: QraqebFinish }) {
  return pairs === 1 ? (
    <QraqebPair rotation={[0.25, 0, 0.1]} finish={finish} />
  ) : (
    <group>
      <QraqebPair position={[-0.02, 0.0, 0.06]} rotation={[0.3, 0.2, 0.1]} finish={finish} />
      <QraqebPair position={[0.03, 0.02, -0.07]} rotation={[0.1, -0.35, -0.12]} finish={finish} />
    </group>
  )
}
