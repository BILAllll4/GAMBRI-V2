import * as THREE from 'three'
import { GEO, type GuembriString } from '../data/notes'

/** endpoints of a string's speaking length: nut (binding on neck) → bridge */
export function stringEnds(s: GuembriString) {
  const nut = new THREE.Vector3(s.nutX, GEO.neckY + GEO.neckRadius * 0.95 + s.radius, s.nutZ)
  const bridge = new THREE.Vector3(GEO.bridgeX, GEO.bridgeTop + s.radius, s.bridgeZ)
  const tail = new THREE.Vector3(GEO.tailX, GEO.tailY, s.bridgeZ * 0.3)
  return { nut, bridge, tail }
}

/** point at fraction f (0 = nut, 1 = bridge) along the speaking length */
export function stringPoint(s: GuembriString, f: number) {
  const { nut, bridge } = stringEnds(s)
  return nut.clone().lerp(bridge, f)
}
