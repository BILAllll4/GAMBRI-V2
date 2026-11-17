/**
 * Preloader state, shared by the loading screen (components/Preloader) and the
 * sections that should wait for it (the intro timeline starts on reveal).
 *
 * Kept tiny and three-free so it lives in the main bundle: the loading screen
 * must paint before any 3D code has downloaded.
 */
import { create } from 'zustand'

export type PreloadPhase = 'loading' | 'leaving' | 'done'

export const usePreload = create<{ progress: number; phase: PreloadPhase }>(() => ({ progress: 0, phase: 'loading' }))

/** true once the loading screen has started to fade out */
export const isRevealed = () => usePreload.getState().phase !== 'loading'

/** run `cb` when the site is revealed (immediately if it already is); returns an unsubscribe */
export function onReveal(cb: () => void): () => void {
  if (isRevealed()) {
    cb()
    return () => {}
  }
  const off = usePreload.subscribe((s) => {
    if (s.phase === 'loading') return
    off()
    cb()
  })
  return off
}
