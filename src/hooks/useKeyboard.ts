import { useEffect } from 'react'
import { NOTE_BY_KEY } from '../data/notes'
import { engine } from '../audio/engine'
import { startDemo, stopDemo, toggleMusic } from '../audio/demo'
import { useGuembri } from '../store/useGuembri'

/**
 * A E Y Q W X C V B N play notes. Matching is on the produced character
 * (e.key), so the letters work on AZERTY, QWERTY and QWERTZ layouts alike.
 * Space toggles the current piece, 9 opens the music list and plays,
 * R resets the camera, M mutes.
 */
export function useKeyboard() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return
      // only while the guembri section is on screen, and never while typing in a form
      if (!useGuembri.getState().sectionActive) return
      const target = e.target as HTMLElement | null
      if (target) {
        const tag = target.tagName
        if (tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable) return
        if (tag === 'INPUT' && (target as HTMLInputElement).type !== 'range') return
      }
      const ch = e.key.length === 1 ? e.key.toUpperCase() : ''
      if (NOTE_BY_KEY.has(ch)) {
        e.preventDefault()
        void engine.unlock().then(() => engine.play(ch, 0.95))
        return
      }
      if (e.key === '9') {
        e.preventDefault()
        toggleMusic()
      } else if (e.code === 'Space' && target?.tagName !== 'BUTTON') {
        e.preventDefault()
        useGuembri.getState().demo ? stopDemo() : void startDemo()
      } else if (ch === 'R') {
        useGuembri.getState().goTo('overview')
      } else if (ch === 'M') {
        const s = useGuembri.getState()
        s.set({ muted: !s.muted })
        engine.applyVolume()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
