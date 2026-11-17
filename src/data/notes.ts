/**
 * String layout and note map for the interactive guembri.
 *
 * The guembri is a three-stringed, fretless bass lute. Pitches here are a
 * REFERENCE TUNING chosen for this demo (two long strings an octave apart and a
 * shorter third string). Real instruments are tuned by ear by the player and
 * vary from maâlem to maâlem — replace with values from your recordings.
 */

export type StringId = 0 | 1 | 2

export interface GuembriString {
  id: StringId
  name: string
  /** open-string frequency (Hz) */
  openHz: number
  /** gauge used for rendering (m) */
  radius: number
  /** x position (instrument space) where the string is bound to the neck */
  nutX: number
  /** lateral offset (z) at the bridge */
  bridgeZ: number
  /** lateral offset (z) at the neck */
  nutZ: number
}

export interface Note {
  key: string // keyboard key, upper case
  name: string // e.g. "D2"
  hz: number
  string: StringId
  /** stop position from the nut (0) toward the bridge (1); 0 = open string */
  stop: number
}

export const STRINGS: GuembriString[] = [
  { id: 0, name: 'Low string', openHz: 73.42, radius: 0.0019, nutX: 0.5, bridgeZ: 0.014, nutZ: 0.006 },
  { id: 1, name: 'Octave string', openHz: 146.83, radius: 0.0014, nutX: 0.46, bridgeZ: -0.014, nutZ: -0.006 },
  { id: 2, name: 'Short string', openHz: 130.81, radius: 0.0012, nutX: 0.08, bridgeZ: 0, nutZ: 0 },
]

const A4 = 440
const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
export const midiToHz = (m: number) => A4 * Math.pow(2, (m - 69) / 12)
const nameOf = (m: number) => `${NAMES[m % 12]}${Math.floor(m / 12) - 1}`

/** stop fraction along the string so that open → target pitch (ideal string) */
const stopFor = (openHz: number, hz: number) => {
  const f = 1 - openHz / hz
  return Math.abs(f) < 0.005 ? 0 : f // treat rounding noise as the open string
}

function note(key: string, midi: number, string: StringId): Note {
  const hz = midiToHz(midi)
  return { key, name: nameOf(midi), hz, string, stop: stopFor(STRINGS[string].openHz, hz) }
}

/**
 * Ten keys, low → high, across a D minor-pentatonic set (D F G A C).
 * Mapping inspired by the A E Y Q W X C V B N layout of the reference.
 */
export const NOTES: Note[] = [
  note('A', 38, 0), // D2 open low string
  note('E', 41, 0), // F2
  note('Y', 43, 0), // G2
  note('Q', 45, 0), // A2
  note('W', 48, 2), // C3 open short string
  note('X', 50, 1), // D3 open octave string
  note('C', 53, 1), // F3
  note('V', 55, 1), // G3
  note('B', 57, 1), // A3
  note('N', 60, 1), // C4
]

export const NOTE_BY_KEY = new Map(NOTES.map((n) => [n.key, n]))
export const OPEN_NOTE: Record<StringId, Note> = {
  0: NOTES[0],
  1: NOTES[5],
  2: NOTES[4],
}

/* ---------------- instrument geometry shared by model + strings ---------------- */
export const GEO = {
  bodyStart: -0.64, // tail end of the body
  bodyEnd: -0.06, // neck end of the body
  bodyWidth: 0.23,
  bodyDepth: 0.17,
  neckRadius: 0.0165,
  neckY: 0.008, // neck centre height (the stick runs just under/over the skin)
  neckTip: 0.62,
  bridgeX: -0.47,
  bridgeTop: 0.052,
  tailX: -0.635,
  tailY: 0.026, // where strings leave the spike knot
  skinY: 0.0115, // top surface of the skin
}
