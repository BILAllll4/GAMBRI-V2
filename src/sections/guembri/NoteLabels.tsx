/**
 * Note buttons for the guembri, as a plain DOM overlay over the canvas.
 * NoteMarkers (inside the 3D scene) moves each anchor every frame to the exact
 * point on the string, so the buttons stay glued to the instrument.
 *
 * Each button is a round note disc with its keyboard key in a small badge, as
 * in the reference. The low and octave strings run only ~1.5 cm apart and share
 * stop positions (they are an octave apart), so the octave string's buttons sit
 * on one side of the strings and the low/short strings' on the other, each
 * joined to its note by a short stem.
 */
import { memo } from 'react'
import { NOTES, type Note } from '../../data/notes'
import { useGuembri } from '../../store/useGuembri'
import { engine } from '../../audio/engine'

export const labelAnchors = new Map<string, HTMLElement>()

const play = (key: string) => void engine.unlock().then(() => engine.play(key, 0.95))
/** "D2" → "D", "C#3" → "C#" */
const pitch = (name: string) => name.replace(/-?\d+$/, '')

export const NoteLabel = memo(function Label({ note }: { note: Note }) {
  const active = useGuembri((s) => s.activeKey === note.key)
  return (
    <div
      className={`note-tag ${note.string === 1 ? 'side-a' : 'side-b'} ${active ? 'active' : ''}`}
      onPointerDown={(e) => {
        e.stopPropagation()
        play(note.key)
      }}
      role="button"
      tabIndex={-1}
      aria-label={`Play ${note.name} (key ${note.key})`}
    >
      <span className="stem" />
      <span className="dot">{pitch(note.name)}</span>
      <span className="key">{note.key}</span>
    </div>
  )
})

/** DOM overlay holding the note buttons (place it over the canvas) */
export function NoteLabels() {
  return (
    <div className="pointer-events-none absolute inset-0 z-[5] overflow-hidden" aria-label="Notes">
      {NOTES.map((n) => (
        <div
          key={n.key}
          ref={(el) => {
            if (el) labelAnchors.set(n.key, el)
            else labelAnchors.delete(n.key)
          }}
          className="absolute left-0 top-0"
          style={{ visibility: 'hidden' }}
        >
          <NoteLabel note={n} />
        </div>
      ))}
    </div>
  )
}
