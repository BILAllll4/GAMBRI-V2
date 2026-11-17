/**
 * GAMBRI V2 — the guembri journey, one scroll value, one story:
 *   SELECT → ZOOM OUT → ISOLATE → TRANSITION → PLAY
 *
 * journey.p (0..1) is written by the section's ScrollTrigger and read every
 * frame by the 3D scene and the DOM overlays (no React re-render on scroll).
 * The selected guembri lives in useSelection and is the same object from the
 * first scene to the playing scene.
 */
import * as THREE from 'three'
import { create } from 'zustand'
import type { ComponentId } from '../../data/anatomy'

export const journey = { p: 0, zoom: 1 }

export const ZOOM_MIN = 1
export const ZOOM_MAX = 2.4
export function zoomBy(f: number) {
  journey.zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, journey.zoom * f))
}

/** which of the three guembris is selected (data/selection.ts OPTIONS) */
export const useSelection = create<{ index: number; select: (i: number) => void }>((set) => ({
  index: 0,
  select: (i) => set({ index: (i + 3) % 3 }),
}))

/* ------------------------------------------------------------------ timeline */

export const T = {
  select: [0, 0.06], // the selection scene holds; the visitor turns and picks
  zoomOut: [0.06, 0.3], // the whole scene pulls back; info and carousel leave
  isolate: [0.3, 0.48], // the room goes dark, the chosen guembri comes to the centre and closer
  travel: [0.5, 0.86], // upright → flat playing pose, the light changes
} as const

const ss = (x: number, a: number, b: number) => THREE.MathUtils.smoothstep(x, a, b)
export const zoomOutOf = (p = journey.p) => ss(p, T.zoomOut[0], T.zoomOut[1])
export const isolateOf = (p = journey.p) => ss(p, T.isolate[0], T.isolate[1])
export const travelOf = (p = journey.p) => ss(p, T.travel[0], T.travel[1])

/** where the carousel slots sit on screen (fractions of the viewport), and the arrows */
export const SLOTS = {
  landscape: { x: [0.28, 0.42, 0.56], y: 0.84, arrows: [0.13, 0.86] },
  portrait: { x: [0.24, 0.5, 0.76], y: 0.86, arrows: [0.06, 0.94] },
}

/**
 * Component transforms used by GuembriGLB `explodable` (kept from V1; the V2
 * story does not take the instrument apart, so they stay at rest).
 */
export const parts: Record<ComponentId, { pos: THREE.Vector3; rot: THREE.Euler; focus: number }> = {
  wood: { pos: new THREE.Vector3(), rot: new THREE.Euler(), focus: 0 },
  leather: { pos: new THREE.Vector3(), rot: new THREE.Euler(), focus: 0 },
  strings: { pos: new THREE.Vector3(), rot: new THREE.Euler(), focus: 0 },
  neck: { pos: new THREE.Vector3(), rot: new THREE.Euler(), focus: 0 },
}
