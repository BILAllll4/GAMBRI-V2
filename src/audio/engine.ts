/**
 * Guembri audio engine (Web Audio API).
 *
 * 1. On boot it looks for recorded samples described by
 *    /audio/guembri/manifest.json  →  { "notes": { "A": "a.mp3", ... } }
 *    Any key with a recording uses it.
 * 2. Keys without a recording fall back to an ORIGINAL synthesized study tone:
 *    a Karplus–Strong plucked string with a skin "thump" and a rattle that
 *    imitates the buzzing metal sersera. These are clearly labelled in the UI
 *    as synthesized — they are not presented as authentic recordings.
 *
 * Voice policy: each string is monophonic (like the real instrument — a new
 * note on a string chokes the previous one with a 30 ms fade), and a global
 * cap keeps overlap under control.
 */
import { NOTES, NOTE_BY_KEY, type Note, type StringId } from '../data/notes'
import { excitation, notePulse, useGuembri } from '../store/useGuembri'

interface Voice {
  src: AudioBufferSourceNode
  gain: GainNode
  string: StringId
  started: number
}

const MAX_VOICES = 6

class GuembriEngine {
  ctx: AudioContext | null = null
  master!: GainNode
  bus!: GainNode
  analyser!: AnalyserNode
  private buffers = new Map<string, AudioBuffer>()
  private voices: Voice[] = []
  private timeData = new Uint8Array(1024)
  private freqData = new Uint8Array(512)
  private booting: Promise<void> | null = null

  /** Build context + buffers. Safe to call before a user gesture (context stays suspended). */
  boot() {
    if (this.booting) return this.booting
    this.booting = this._boot()
    return this.booting
  }

  private async _boot() {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new AC({ latencyHint: 'interactive' })
    this.ctx = ctx

    // signal chain: voices → bus (body EQ) → compressor → master → analyser → out
    this.bus = ctx.createGain()
    const lowShelf = ctx.createBiquadFilter()
    lowShelf.type = 'lowshelf'
    lowShelf.frequency.value = 140
    lowShelf.gain.value = 4
    const skin = ctx.createBiquadFilter()
    skin.type = 'peaking'
    skin.frequency.value = 220
    skin.Q.value = 1.1
    skin.gain.value = 3
    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = -16
    comp.ratio.value = 3
    comp.attack.value = 0.004
    comp.release.value = 0.2
    this.master = ctx.createGain()
    this.analyser = ctx.createAnalyser()
    this.analyser.fftSize = 2048
    this.analyser.smoothingTimeConstant = 0.6
    this.bus.connect(lowShelf).connect(skin).connect(comp).connect(this.master).connect(this.analyser)
    this.analyser.connect(ctx.destination)
    this.applyVolume()

    const recorded = await this.loadSamples(ctx)
    // synthesize any notes that have no recording (in small chunks to keep the main thread free)
    for (const n of NOTES) {
      if (!this.buffers.has(n.key)) {
        this.buffers.set(n.key, synthesizeGuembriNote(ctx.sampleRate, n.hz, n.string))
        await new Promise((r) => setTimeout(r, 0))
      }
    }
    useGuembri.getState().set({ source: recorded > 0 ? 'samples' : 'synth' })
  }

  private async loadSamples(ctx: AudioContext): Promise<number> {
    try {
      const res = await fetch('/audio/guembri/manifest.json', { cache: 'no-cache' })
      if (!res.ok) return 0
      const manifest = (await res.json()) as { notes?: Record<string, string> }
      const entries = Object.entries(manifest.notes ?? {})
      const loaded = await Promise.all(
        entries.map(async ([key, file]) => {
          try {
            const r = await fetch(`/audio/guembri/${file}`)
            if (!r.ok) return 0
            const buf = await ctx.decodeAudioData(await r.arrayBuffer())
            this.buffers.set(key.toUpperCase(), buf)
            return 1
          } catch {
            console.warn(`[guembri] could not decode sample for ${key}: ${file}`)
            return 0
          }
        }),
      )
      return loaded.reduce<number>((a, b) => a + b, 0)
    } catch {
      return 0
    }
  }

  /** must be called from a user gesture */
  async unlock() {
    await this.boot()
    if (this.ctx && this.ctx.state !== 'running') await this.ctx.resume()
    useGuembri.getState().set({ started: true })
  }

  applyVolume() {
    if (!this.ctx) return
    const { volume, muted } = useGuembri.getState()
    this.master.gain.setTargetAtTime(muted ? 0 : volume, this.ctx.currentTime, 0.02)
  }

  /** Play a note now (or at `when` in AudioContext time). Visuals fire in sync. */
  play(key: string, velocity = 1, when?: number) {
    const n = NOTE_BY_KEY.get(key.toUpperCase())
    const ctx = this.ctx
    if (!n || !ctx) return
    const buf = this.buffers.get(n.key)
    if (!buf) return
    if (ctx.state !== 'running') void this.unlock()

    const t = Math.max(when ?? ctx.currentTime, ctx.currentTime)
    this.choke(n.string, t)
    if (this.voices.length >= MAX_VOICES) this.release(this.voices[0], t)

    const src = ctx.createBufferSource()
    src.buffer = buf
    const gain = ctx.createGain()
    gain.gain.value = 0.85 * velocity
    src.connect(gain).connect(this.bus)
    src.start(t)
    const voice: Voice = { src, gain, string: n.string, started: t }
    this.voices.push(voice)
    src.onended = () => {
      this.voices = this.voices.filter((v) => v !== voice)
      gain.disconnect()
    }

    const delayMs = Math.max(0, (t - ctx.currentTime) * 1000)
    if (delayMs < 4) this.visual(n, velocity)
    else window.setTimeout(() => this.visual(n, velocity), delayMs)
  }

  private visual(n: Note, velocity: number) {
    const now = performance.now() / 1000
    excitation[n.string] = { t0: now, amp: velocity, stop: n.stop, hz: n.hz }
    notePulse.set(n.key, now)
    useGuembri.getState().set({ activeKey: n.key, lastNote: { key: n.key, name: n.name, hz: n.hz, at: now } })
    window.setTimeout(() => {
      if (useGuembri.getState().activeKey === n.key) useGuembri.getState().set({ activeKey: null })
    }, 260)
  }

  private choke(string: StringId, t: number) {
    for (const v of this.voices) if (v.string === string) this.release(v, t)
  }

  private release(v: Voice, t: number) {
    v.gain.gain.cancelScheduledValues(t)
    v.gain.gain.setValueAtTime(v.gain.gain.value, t)
    v.gain.gain.linearRampToValueAtTime(0, t + 0.03)
    try {
      v.src.stop(t + 0.035)
    } catch {
      /* already stopped */
    }
    this.voices = this.voices.filter((x) => x !== v)
  }

  stopAll() {
    if (!this.ctx) return
    for (const v of [...this.voices]) this.release(v, this.ctx.currentTime)
  }

  /** 0..1 loudness + band energies, read every frame by the 3D scene */
  levels() {
    if (!this.ctx || this.ctx.state !== 'running') return { rms: 0, low: 0, mid: 0, high: 0 }
    this.analyser.getByteTimeDomainData(this.timeData)
    let sum = 0
    for (let i = 0; i < this.timeData.length; i++) {
      const v = (this.timeData[i] - 128) / 128
      sum += v * v
    }
    this.analyser.getByteFrequencyData(this.freqData)
    const band = (a: number, b: number) => {
      let s = 0
      for (let i = a; i < b; i++) s += this.freqData[i]
      return s / ((b - a) * 255)
    }
    // bin width ≈ sampleRate / 2048 ≈ 23 Hz
    return { rms: Math.min(1, Math.sqrt(sum / this.timeData.length) * 3), low: band(2, 12), mid: band(12, 60), high: band(60, 300) }
  }

  waveform() {
    if (!this.ctx) return null
    this.analyser.getByteTimeDomainData(this.timeData)
    return this.timeData
  }
}

export const engine = new GuembriEngine()

/* ------------------------------------------------------------------------ */
/* Original synthesized study tone                                           */
/* ------------------------------------------------------------------------ */

function synthesizeGuembriNote(sr: number, hz: number, string: StringId): AudioBuffer {
  const dur = string === 0 ? 3.2 : 2.6
  const len = Math.floor(sr * dur)
  const out = new Float32Array(len)

  // --- Karplus–Strong string with fractional delay -----------------------
  const period = sr / hz - 0.5
  const N = Math.floor(period)
  const frac = period - N
  const ring = new Float32Array(N)
  // excitation: soft thumb pluck on gut = low-passed noise with a pluck-position comb
  let lp = 0
  const pluckPos = 0.18
  const excite = new Float32Array(N)
  for (let i = 0; i < ring.length; i++) {
    lp += 0.35 * (Math.random() * 2 - 1 - lp)
    excite[i] = lp
  }
  const comb = Math.max(1, Math.floor(pluckPos * N))
  for (let i = 0; i < ring.length; i++) ring[i] = excite[i] - 0.9 * (excite[i - comb] ?? 0)

  // gut strings lose energy fast; higher strings a little faster
  const decay = string === 0 ? 0.9966 : string === 1 ? 0.9952 : 0.9958
  const bright = string === 0 ? 0.45 : 0.55 // loop-filter blend
  let idx = 0
  let prev = 0
  for (let n = 0; n < len; n++) {
    const a = ring[idx]
    const b = ring[(idx + 1) % N]
    const y = a + frac * (b - a)
    const filtered = decay * (bright * y + (1 - bright) * prev)
    prev = filtered
    ring[idx] = filtered
    idx = (idx + 1) % N
    out[n] = y
  }

  // --- normalise string then add body/skin thump -------------------------
  let peak = 0
  for (let n = 0; n < len; n++) peak = Math.max(peak, Math.abs(out[n]))
  const g = peak > 0 ? 0.7 / peak : 1
  let phase = 0
  for (let n = 0; n < len; n++) {
    out[n] *= g
    const t = n / sr
    // skin slap: short sine with downward pitch glide
    const f = 95 + 120 * Math.exp(-t * 60)
    phase += (2 * Math.PI * f) / sr
    out[n] += Math.sin(phase) * 0.32 * Math.exp(-t * 28)
  }

  // --- sersera rattle: metallic noise gated by string amplitude ----------
  // two resonant band-passes give a tinny, buzzing character
  const bp = (f0: number, q: number) => {
    const w = (2 * Math.PI * f0) / sr
    const alpha = Math.sin(w) / (2 * q)
    const a0 = 1 + alpha
    return { b0: alpha / a0, b2: -alpha / a0, a1: (-2 * Math.cos(w)) / a0, a2: (1 - alpha) / a0, x1: 0, x2: 0, y1: 0, y2: 0 }
  }
  const f1 = bp(3300, 6)
  const f2 = bp(5100, 8)
  const run = (f: ReturnType<typeof bp>, x: number) => {
    const y = f.b0 * x + f.b2 * f.x2 - f.a1 * f.y1 - f.a2 * f.y2
    f.x2 = f.x1
    f.x1 = x
    f.y2 = f.y1
    f.y1 = y
    return y
  }
  let env = 0
  for (let n = 0; n < len; n++) {
    env = Math.max(Math.abs(out[n]), env * 0.9992)
    const gate = Math.max(0, env - 0.18)
    const noise = Math.random() * 2 - 1
    const buzz = (run(f1, noise) + 0.7 * run(f2, noise)) * gate * 0.55
    out[n] += buzz
  }

  // --- short fade-in/out and final normalise -----------------------------
  peak = 0
  for (let n = 0; n < len; n++) peak = Math.max(peak, Math.abs(out[n]))
  const fadeIn = Math.floor(sr * 0.002)
  const fadeOut = Math.floor(sr * 0.25)
  for (let n = 0; n < len; n++) {
    let e = 0.9 / peak
    if (n < fadeIn) e *= n / fadeIn
    if (n > len - fadeOut) e *= (len - n) / fadeOut
    out[n] *= e
  }

  const buffer = new AudioBuffer({ length: len, sampleRate: sr, numberOfChannels: 1 })
  buffer.copyToChannel(out, 0)
  return buffer
}
