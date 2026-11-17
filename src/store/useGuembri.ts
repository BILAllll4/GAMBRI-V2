import { create } from 'zustand'
import type { StringId } from '../data/notes'
import type { ComponentId } from '../data/anatomy'

export type ViewId = 'overview' | 'body' | 'strings' | 'neck' | 'sersera'

interface GuembriState {
  ready: boolean
  started: boolean // user unlocked audio
  activeKey: string | null
  lastNote: { key: string; name: string; hz: number; at: number } | null
  hoverString: StringId | null
  volume: number
  muted: boolean
  demo: boolean
  view: ViewId
  viewNonce: number
  infoOpen: boolean
  source: 'loading' | 'samples' | 'synth'
  /** the guembri section is on screen (keyboard + render loop active) */
  sectionActive: boolean
  /** the component in focus during the exploration (null = none) */
  part: ComponentId | null
  /** inspect mode: wheel / pinch zoom and touch-orbit enabled */
  inspect: boolean
  zoomNonce: number
  zoomDir: 1 | -1
  zoom: (dir: 1 | -1) => void
  set: (p: Partial<GuembriState>) => void
  goTo: (v: ViewId) => void
}

export const useGuembri = create<GuembriState>((set) => ({
  ready: false,
  started: false,
  activeKey: null,
  lastNote: null,
  hoverString: null,
  volume: 0.8,
  muted: false,
  demo: false,
  view: 'overview',
  viewNonce: 0,
  infoOpen: false,
  source: 'loading',
  sectionActive: false,
  part: null,
  inspect: false,
  zoomNonce: 0,
  zoomDir: 1,
  zoom: (zoomDir) => set((s) => ({ zoomDir, zoomNonce: s.zoomNonce + 1 })),
  set: (p) => set(p),
  goTo: (view) => set((s) => ({ view, viewNonce: s.viewNonce + 1 })),
}))

/**
 * Per-frame string excitation, kept outside React so useFrame can read it
 * without triggering renders.
 */
export interface StringExcitation {
  t0: number // performance.now()/1000 when plucked
  amp: number
  stop: number
  hz: number
}
export const excitation: Record<StringId, StringExcitation> = {
  0: { t0: -100, amp: 0, stop: 0, hz: 73 },
  1: { t0: -100, amp: 0, stop: 0, hz: 147 },
  2: { t0: -100, amp: 0, stop: 0, hz: 131 },
}

/** last pluck per note key, for marker glow */
export const notePulse = new Map<string, number>()
