/**
 * Procedural 3D models for the catalogue's accessories: coiled gut strings,
 * leather tuning bindings on a section of neck, a cowrie-embroidered cap and a
 * padded carry bag. Built in code like the qraqeb, at roughly 1 unit tall, so
 * the collection can show a real, turnable model instead of a picture.
 * Proportions are illustrative, not measured from specific products.
 */
import { useMemo } from 'react'
import * as THREE from 'three'
import { cordTextures, woodTextures } from './textures'

export type AccessoryId = 'strings' | 'bindings' | 'cap' | 'bag'

/** a flat spiral in the XY plane (r0 → r1 over `turns`), drifting slightly in z */
class Spiral extends THREE.Curve<THREE.Vector3> {
  constructor(private r0: number, private r1: number, private turns: number, private dz: number) {
    super()
  }
  getPoint(t: number, out = new THREE.Vector3()) {
    const a = t * this.turns * Math.PI * 2
    const r = THREE.MathUtils.lerp(this.r0, this.r1, t)
    return out.set(Math.cos(a) * r, Math.sin(a) * r, Math.sin(a * 3) * 0.004 + t * this.dz)
  }
}

/** a helix around the Y axis */
class Helix extends THREE.Curve<THREE.Vector3> {
  constructor(private r: number, private h: number, private turns: number) {
    super()
  }
  getPoint(t: number, out = new THREE.Vector3()) {
    const a = t * this.turns * Math.PI * 2
    return out.set(Math.cos(a) * this.r, (t - 0.5) * this.h, Math.sin(a) * this.r)
  }
}

function GutStrings() {
  const { geos, gut, paper } = useMemo(
    () => ({
      geos: [
        new THREE.TubeGeometry(new Spiral(0.3, 0.22, 4.5, 0.03), 900, 0.0075, 8),
        new THREE.TubeGeometry(new Spiral(0.27, 0.2, 4.2, 0.03), 840, 0.0062, 8),
        new THREE.TubeGeometry(new Spiral(0.24, 0.17, 4, 0.03), 800, 0.005, 8),
      ],
      gut: new THREE.MeshPhysicalMaterial({ color: '#d8c193', roughness: 0.42, sheen: 0.6, sheenColor: new THREE.Color('#fff1d0'), clearcoat: 0.3 }),
      paper: new THREE.MeshStandardMaterial({ color: '#efe4cc', roughness: 0.9 }),
    }),
    [],
  )
  return (
    <group>
      {/* three coils, largest at the back, each held by a paper band */}
      {geos.map((g, i) => (
        <group key={i} position={[(i - 1) * 0.16, 0.28 - i * 0.28, i * 0.05]} rotation={[0.1, (i - 1) * 0.25, i * 0.6]}>
          <mesh geometry={g} material={gut} castShadow />
          <mesh material={paper} position={[0.26 - i * 0.03, 0, 0.015]} rotation={[0, 0, 0]}>
            <boxGeometry args={[0.03, 0.09, 0.05]} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function LeatherBindings() {
  const { leather, wood, wrap, strap } = useMemo(() => {
    const cord = cordTextures(17)
    const w = woodTextures(256, 41, [0.3, 0.19, 0.1])
    return {
      leather: new THREE.MeshStandardMaterial({ map: cord.map, bumpMap: cord.bumpMap, bumpScale: 1.2, roughness: 0.75, color: '#8a5634' }),
      wood: new THREE.MeshStandardMaterial({ ...w, bumpScale: 0.4, roughness: 0.6 }),
      wrap: new THREE.TubeGeometry(new Helix(0.071, 0.36, 11), 700, 0.011, 8),
      strap: new THREE.TubeGeometry(new Spiral(0.2, 0.12, 3, 0.02), 500, 0.012, 6),
    }
  }, [])
  return (
    <group>
      {/* a section of guembri neck with the bindings wrapped round it */}
      <group rotation={[0, 0, -0.32]} position={[0.08, 0.05, 0]}>
        <mesh material={wood} castShadow>
          <cylinderGeometry args={[0.06, 0.06, 1.1, 40]} />
        </mesh>
        <mesh geometry={wrap} material={leather} position={[0, 0.2, 0]} castShadow />
      </group>
      {/* a spare length, coiled loose in front */}
      <mesh geometry={strap} material={leather} position={[-0.18, -0.36, 0.14]} rotation={[-0.3, 0.3, 0]} scale={[1, 1, 3]} castShadow />
    </group>
  )
}

function CowrieCap() {
  const { felt, shell, band, tassel, spots } = useMemo(() => {
    // cowries sewn in lines: one row round the band, then eight lines running up to the crown
    const pts: { p: THREE.Vector3; q: THREE.Quaternion }[] = []
    const put = (el: number, az: number) => {
      const dir = new THREE.Vector3(Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az))
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir)
      // turn each shell so its long axis follows the line it is sewn along
      q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2))
      pts.push({ p: dir.multiplyScalar(0.405), q })
    }
    for (let i = 0; i < 26; i++) put(0.1, (i / 26) * Math.PI * 2)
    for (let m = 0; m < 8; m++) for (let k = 0; k < 5; k++) put(0.3 + k * 0.22, (m / 8) * Math.PI * 2)
    const cord = cordTextures(23)
    return {
      felt: new THREE.MeshStandardMaterial({ color: '#2c2620', roughness: 0.95, bumpMap: cord.bumpMap, bumpScale: 0.6 }),
      tassel: new THREE.MeshStandardMaterial({ color: '#8a3a2a', roughness: 0.9 }),
      shell: new THREE.MeshPhysicalMaterial({ color: '#f3ead8', roughness: 0.25, clearcoat: 0.6 }),
      band: new THREE.MeshStandardMaterial({ color: '#2a2018', roughness: 0.8 }),
      spots: pts,
    }
  }, [])
  return (
    <group rotation={[0.38, 0, 0]} position={[0, -0.12, 0]}>
      <mesh material={felt} castShadow>
        <sphereGeometry args={[0.4, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      <mesh material={band} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.402, 0.022, 10, 64]} />
      </mesh>
      {/* tassel on the crown */}
      <mesh material={tassel} position={[0, 0.43, 0]}>
        <sphereGeometry args={[0.035, 16, 12]} />
      </mesh>
      <mesh material={tassel} position={[0.05, 0.36, 0.03]} rotation={[0.2, 0, -0.9]}>
        <cylinderGeometry args={[0.012, 0.03, 0.16, 12]} />
      </mesh>
      {spots.map((s, i) => (
        <mesh key={i} material={shell} position={s.p} quaternion={s.q} scale={[0.022, 0.034, 0.018]} castShadow>
          <sphereGeometry args={[1, 14, 10]} />
        </mesh>
      ))}
    </group>
  )
}

function CarryBag() {
  const { canvas, trim, strap } = useMemo(() => {
    const cord = cordTextures(29)
    return {
      canvas: new THREE.MeshStandardMaterial({ color: '#2f4a3c', roughness: 0.92, bumpMap: cord.bumpMap, bumpScale: 0.5 }),
      trim: new THREE.MeshStandardMaterial({ color: '#a8875a', metalness: 0.7, roughness: 0.4 }),
      strap: new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3([new THREE.Vector3(0.05, 0.62, 0.08), new THREE.Vector3(0.26, 0.2, 0.2), new THREE.Vector3(0.24, -0.25, 0.2), new THREE.Vector3(0.12, -0.5, 0.12)]),
        80,
        0.016,
        8,
      ),
    }
  }, [])
  return (
    <group rotation={[0, 0, 0.12]}>
      {/* padded body, shaped round the guembri's body and neck */}
      <mesh material={canvas} position={[0, -0.36, 0]} scale={[0.28, 0.32, 0.13]} castShadow>
        <sphereGeometry args={[1, 40, 24]} />
      </mesh>
      <mesh material={canvas} position={[0, 0.2, 0]} castShadow>
        <capsuleGeometry args={[0.085, 0.72, 8, 24]} />
      </mesh>
      {/* zip line and pull */}
      <mesh material={trim} position={[0, 0.05, 0.088]}>
        <boxGeometry args={[0.006, 0.95, 0.004]} />
      </mesh>
      <mesh material={trim} position={[0.012, 0.56, 0.092]}>
        <boxGeometry args={[0.018, 0.04, 0.006]} />
      </mesh>
      <mesh geometry={strap} material={canvas} castShadow />
    </group>
  )
}

export function Accessory({ id }: { id: AccessoryId }) {
  if (id === 'strings') return <GutStrings />
  if (id === 'bindings') return <LeatherBindings />
  if (id === 'cap') return <CowrieCap />
  return <CarryBag />
}
