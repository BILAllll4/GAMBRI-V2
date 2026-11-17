/**
 * The music player of Page 3: five ORIGINAL looping pieces, played on the 3D
 * guembri itself (every note goes through the same engine as a key press, so
 * the strings vibrate and the note buttons light up as the music plays).
 *
 * They are written for this site in a lilting ternary (12/8-style) feel. They
 * are NOT transcriptions of traditional Gnawa pieces: to offer authentic
 * repertoire, add licensed recordings (see README).
 *
 * Space starts / stops the current piece; 9 (or the small player button)
 * starts the music and opens the list of five pieces.
 * Timing uses a look-ahead scheduler driven by the audio clock.
 */
import { create } from 'zustand'
import { engine } from './engine'
import { useGuembri } from '../store/useGuembri'
import type { T } from '../lib/i18n'

type Hit = [step: number, key: string, velocity: number]

export interface Track {
  title: T
  mood: T
  bpm: number // dotted-quarter pulse
  steps: number // 12 per bar
  pattern: Hit[]
}

/** repeat a one-bar figure over n bars, with an optional different last bar */
function bars(figure: Hit[], n: number, last?: Hit[]): Hit[] {
  const out: Hit[] = []
  for (let b = 0; b < n; b++) for (const [s, k, v] of b === n - 1 && last ? last : figure) out.push([s + b * 12, k, v])
  return out
}

export const TRACKS: Track[] = [
  {
    title: { en: 'Lila pulse', fr: 'Pulsation de lila', ar: 'نبض الليلة' },
    mood: { en: 'Steady, swaying', fr: 'Régulier, balancé', ar: 'ثابت ومتمايل' },
    bpm: 92,
    steps: 48,
    pattern: [
      [0, 'A', 1], [3, 'A', 0.6], [5, 'X', 0.7], [6, 'A', 0.9], [8, 'Q', 0.6], [9, 'Y', 0.7], [11, 'E', 0.55],
      [12, 'A', 1], [15, 'A', 0.6], [17, 'W', 0.7], [18, 'A', 0.9], [20, 'C', 0.6], [21, 'X', 0.75], [23, 'W', 0.5],
      [24, 'A', 1], [27, 'A', 0.6], [29, 'X', 0.7], [30, 'A', 0.9], [32, 'Q', 0.6], [33, 'Y', 0.7], [35, 'E', 0.55],
      [36, 'Y', 1], [38, 'Q', 0.7], [39, 'W', 0.7], [41, 'X', 0.8], [42, 'V', 0.8], [43, 'C', 0.6], [44, 'X', 0.7], [45, 'W', 0.6], [47, 'Q', 0.55],
    ],
  },
  {
    title: { en: 'Slow night', fr: 'Nuit lente', ar: 'ليل بطيء' },
    mood: { en: 'Sparse, low', fr: 'Épuré, grave', ar: 'متقطّع وعميق' },
    bpm: 66,
    steps: 48,
    pattern: bars([[0, 'A', 1], [6, 'E', 0.6], [9, 'A', 0.5]], 4, [[0, 'Y', 0.9], [3, 'Q', 0.6], [6, 'E', 0.7], [9, 'A', 0.6], [11, 'A', 0.4]]),
  },
  {
    title: { en: 'The call', fr: 'L’appel', ar: 'النداء' },
    mood: { en: 'Rising phrases', fr: 'Phrases ascendantes', ar: 'جمل صاعدة' },
    bpm: 100,
    steps: 48,
    pattern: [
      ...bars([[0, 'A', 1], [3, 'Y', 0.7], [5, 'Q', 0.6], [6, 'W', 0.8], [8, 'X', 0.7], [9, 'C', 0.75], [11, 'V', 0.6]], 3),
      [36, 'V', 1], [38, 'C', 0.7], [39, 'X', 0.8], [41, 'W', 0.6], [42, 'Q', 0.75], [44, 'Y', 0.6], [45, 'E', 0.7], [47, 'A', 0.5],
    ],
  },
  {
    title: { en: 'Iron and gut', fr: 'Fer et boyau', ar: 'حديد ومصران' },
    mood: { en: 'Driving, percussive', fr: 'Entraînant, percussif', ar: 'دافع وإيقاعي' },
    bpm: 112,
    steps: 24,
    pattern: bars([[0, 'A', 1], [2, 'A', 0.5], [3, 'A', 0.8], [5, 'E', 0.55], [6, 'A', 0.95], [8, 'A', 0.5], [9, 'X', 0.8], [11, 'W', 0.6]], 2, [[0, 'A', 1], [2, 'A', 0.5], [3, 'Y', 0.8], [5, 'Q', 0.6], [6, 'A', 0.95], [8, 'C', 0.6], [9, 'X', 0.8], [10, 'W', 0.55], [11, 'Q', 0.6]]),
  },
  {
    title: { en: 'Dawn', fr: 'Aube', ar: 'الفجر' },
    mood: { en: 'Bright, high strings', fr: 'Lumineux, cordes aiguës', ar: 'مشرق، أوتار حادّة' },
    bpm: 84,
    steps: 48,
    pattern: [
      ...bars([[0, 'A', 0.9], [3, 'B', 0.7], [5, 'N', 0.55], [6, 'V', 0.75], [9, 'C', 0.65], [11, 'B', 0.5]], 3),
      [36, 'N', 0.9], [38, 'B', 0.7], [39, 'V', 0.7], [41, 'C', 0.6], [42, 'X', 0.7], [44, 'W', 0.55], [45, 'A', 0.85],
    ],
  },
]

/**
 * Traditional repertoire, as RECORDINGS: these are real Gnawa pieces, so they
 * are not re-composed here. Drop a recording you have the rights to at `src`
 * (public/audio/tracks/…) and it plays from the list; until then the entry is
 * shown as "recording to be added".
 */
export interface Recording {
  id: string
  title: T
  note: T
  /** a local file in public/audio/tracks … */
  src?: string
  /** … or a YouTube video id, played in YouTube's own embedded player */
  youtube?: string
}
export const RECORDINGS: Recording[] = [
  {
    id: 'baba-mimoun',
    title: { en: 'Baba Mimoun', fr: 'Baba Mimoun', ar: 'بابا ميمون' },
    note: { en: 'Traditional · video on YouTube', fr: 'Traditionnel · vidéo YouTube', ar: 'تقليدي · فيديو على يوتيوب' },
    youtube: 'Cac9upVbFn8',
  },
]

/** UI state of the player: which piece is selected, whether its list is open, the recording playing and which recordings exist */
export const usePlayer = create<{ track: number; open: boolean; rec: string | null; available: Record<string, boolean> }>(() => ({
  track: 0,
  open: false,
  rec: null,
  available: {},
}))

let audio: HTMLAudioElement | null = null

/** check which recordings are on the server (once) */
let checked = false
export function checkRecordings() {
  if (checked) return
  checked = true
  for (const r of RECORDINGS) {
    if (r.youtube) {
      usePlayer.setState((s) => ({ available: { ...s.available, [r.id]: true } }))
      continue
    }
    if (!r.src) continue
    fetch(r.src, { method: 'HEAD' })
      .then((res) => {
        const ok = res.ok && (res.headers.get('content-type') ?? '').startsWith('audio')
        usePlayer.setState((s) => ({ available: { ...s.available, [r.id]: ok } }))
      })
      .catch(() => usePlayer.setState((s) => ({ available: { ...s.available, [r.id]: false } })))
  }
}

export function stopRecording() {
  audio?.pause()
  audio = null
  usePlayer.setState({ rec: null })
}

export function playRecording(id: string) {
  const r = RECORDINGS.find((x) => x.id === id)
  if (!r || !usePlayer.getState().available[id]) return
  stopDemo()
  stopRecording()
  // YouTube: the player itself is rendered by MusicPlayer while rec is set
  if (r.youtube || !r.src) {
    usePlayer.setState({ rec: id })
    return
  }
  const { muted, volume } = useGuembri.getState()
  audio = new Audio(r.src)
  audio.volume = volume
  audio.muted = muted
  audio.onended = () => stopRecording()
  void audio.play().catch(() => stopRecording())
  usePlayer.setState({ rec: id })
}

/** keep a playing recording in step with the sound toggle */
useGuembri.subscribe((s) => {
  if (audio) audio.muted = s.muted
})

let timer: number | null = null
let step = 0
let nextTime = 0
let current: Track = TRACKS[0]

function schedule() {
  const ctx = engine.ctx
  if (!ctx) return
  const stepSec = 60 / current.bpm / 3
  while (nextTime < ctx.currentTime + 0.12) {
    for (const [s, key, vel] of current.pattern) if (s === step) engine.play(key, vel, nextTime)
    // subtle swing on off-beats
    const swing = step % 3 === 1 ? 0.06 : step % 3 === 2 ? -0.06 : 0
    nextTime += stepSec * (1 + swing)
    step = (step + 1) % current.steps
  }
}

/** play a piece (the selected one by default); switching pieces restarts cleanly */
export async function startDemo(track = usePlayer.getState().track) {
  await engine.unlock()
  stopRecording()
  if (timer !== null) window.clearInterval(timer)
  current = TRACKS[track] ?? TRACKS[0]
  usePlayer.setState({ track })
  step = 0
  nextTime = (engine.ctx?.currentTime ?? 0) + 0.08
  timer = window.setInterval(schedule, 25)
  useGuembri.getState().set({ demo: true })
}

export function stopDemo() {
  if (timer !== null) window.clearInterval(timer)
  timer = null
  engine.stopAll()
  useGuembri.getState().set({ demo: false })
}

/** key 9 / the player button: start the music and show the list, or stop and hide it */
export function toggleMusic() {
  const { open, rec } = usePlayer.getState()
  if ((useGuembri.getState().demo || rec) && open) {
    stopDemo()
    stopRecording()
    usePlayer.setState({ open: false })
  } else {
    usePlayer.setState({ open: true })
    void startDemo()
  }
}
