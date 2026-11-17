/**
 * Background typography in Neo-Tifinagh (the IRCAM standard; Unicode block
 * U+2D30–U+2D7F), set in Noto Sans Tifinagh: a few oversized, cropped letters
 * and quiet rows of smaller ones, at very low opacity, drifting slowly with the
 * scroll (transform only). Purely decorative, hidden from assistive tech.
 *
 * Letters are used as letterforms. The only whole words are verified ones:
 *   ⵜⴰⵛⵍⵃⵉⵢⵜ  Taclḥiyt — the Tachelhit language (Wikipedia, "Shilha language")
 *   ⵜⵉⴼⵉⵏⴰⵖ   Tifinagh — the script's name (Wikipedia, "Tifinagh")
 *   ⴰⵎⴰⵣⵉⵖ    Amaziɣ — Amazigh, letter by letter a-m-a-z-i-ɣ in IRCAM Neo-Tifinagh
 * ⵣ (yaz) is the letter z of "Amazigh", used on the Amazigh flag.
 */
import { useEffect, useRef } from 'react'
import { gsap } from '../lib/scroll'
import { prefersReducedMotion } from '../lib/device'

export const WORDS = {
  tachelhit: { tf: 'ⵜⴰⵛⵍⵃⵉⵢⵜ', latin: 'Taclḥiyt', meaning: 'the Tachelhit language' },
  tifinagh: { tf: 'ⵜⵉⴼⵉⵏⴰⵖ', latin: 'Tifinagh', meaning: 'the Amazigh script' },
  amazigh: { tf: 'ⴰⵎⴰⵣⵉⵖ', latin: 'Amaziɣ', meaning: 'Amazigh' },
} as const

type Glyph = { ch: string; x: number; y: number; size: string; rot?: number; depth: number }
type Row = { text: string; x: number; y: number; size: string; depth: number }

/** compositions per section; x/y in % of the layer, depth = parallax strength */
const PRESETS: Record<string, { glyphs: Glyph[]; rows: Row[] }> = {
  hero: {
    glyphs: [
      { ch: 'ⵣ', x: 78, y: 6, size: 'clamp(260px,42vw,680px)', depth: 18 },
      { ch: 'ⴳ', x: -8, y: 58, size: 'clamp(180px,26vw,420px)', depth: 10, rot: -6 },
    ],
    rows: [{ text: 'ⴰ ⴱ ⴳ ⴷ ⴹ ⴻ ⴼ ⴽ ⵀ ⵃ ⵄ ⵅ ⵇ ⵉ ⵊ ⵍ ⵎ ⵏ ⵓ ⵔ ⵕ ⵖ ⵙ ⵚ ⵛ ⵜ ⵟ ⵡ ⵢ ⵣ ⵥ', x: 4, y: 92, size: '13px', depth: 4 }],
  },
  editorial: {
    glyphs: [
      { ch: 'ⵜ', x: 84, y: 4, size: 'clamp(220px,30vw,520px)', depth: 16 },
      { ch: 'ⵖ', x: -6, y: 46, size: 'clamp(160px,22vw,380px)', depth: 10 },
    ],
    rows: [
      { text: WORDS.tachelhit.tf, x: 6, y: 8, size: 'clamp(36px,5vw,72px)', depth: 6 },
      { text: 'ⵣ · ⵣ · ⵣ · ⵣ · ⵣ · ⵣ', x: 62, y: 88, size: '14px', depth: 3 },
    ],
  },
  intro: {
    glyphs: [
      { ch: 'ⵎ', x: 2, y: -4, size: 'clamp(300px,44vw,760px)', depth: 14 },
      { ch: 'ⵉ', x: 90, y: 60, size: 'clamp(200px,28vw,460px)', depth: 22 },
    ],
    rows: [
      { text: WORDS.tifinagh.tf, x: 54, y: 6, size: 'clamp(30px,4vw,60px)', depth: 6 },
      { text: 'ⴰ ⵎ ⴰ ⵣ ⵉ ⵖ', x: 6, y: 94, size: '13px', depth: 3 },
    ],
  },
  play: {
    glyphs: [
      { ch: 'ⵣ', x: 4, y: 2, size: 'clamp(200px,24vw,420px)', depth: 0 },
      { ch: 'ⵙ', x: 82, y: 58, size: 'clamp(200px,24vw,420px)', depth: 0 },
    ],
    rows: [
      { text: 'ⴰ  ⴱ  ⴳ  ⴷ  ⴹ  ⴻ  ⴼ  ⴽ  ⵀ  ⵃ  ⵄ  ⵅ  ⵇ  ⵉ  ⵊ  ⵍ  ⵎ  ⵏ  ⵓ  ⵔ  ⵕ  ⵖ  ⵙ  ⵚ  ⵛ  ⵜ  ⵟ  ⵡ  ⵢ  ⵣ  ⵥ', x: 3, y: 12, size: '15px', depth: 0 },
      { text: 'ⵣ  ⵣ  ⵣ  ⵣ  ⵣ  ⵣ  ⵣ  ⵣ  ⵣ  ⵣ  ⵣ  ⵣ', x: 30, y: 88, size: '15px', depth: 0 },
    ],
  },
  showroom: {
    glyphs: [{ ch: 'ⴰ', x: 72, y: 10, size: 'clamp(200px,26vw,440px)', depth: 12 }],
    rows: [{ text: WORDS.amazigh.tf, x: 6, y: 12, size: 'clamp(28px,3.4vw,52px)', depth: 5 }],
  },
}

export function TifinaghField({ preset, tone = 'dark', opacity = 0.06, className = '' }: { preset: keyof typeof PRESETS; tone?: 'dark' | 'light'; opacity?: number; className?: string }) {
  const root = useRef<HTMLDivElement>(null)
  const p = PRESETS[preset]

  useEffect(() => {
    if (prefersReducedMotion()) return
    const ctx = gsap.context(() => {
      root.current!.querySelectorAll<HTMLElement>('[data-depth]').forEach((el) => {
        const d = Number(el.dataset.depth)
        if (!d) return
        gsap.fromTo(el, { yPercent: d }, { yPercent: -d, ease: 'none', scrollTrigger: { trigger: root.current, start: 'top bottom', end: 'bottom top', scrub: true } })
      })
    }, root)
    return () => ctx.revert()
  }, [preset])

  return (
    <div
      ref={root}
      aria-hidden
      className={`tifinagh pointer-events-none absolute inset-0 select-none overflow-hidden ${tone === 'dark' ? 'text-emerald' : 'text-ivory'} ${className}`}
      style={{ opacity }}
    >
      {p.glyphs.map((g, i) => (
        <span key={`g${i}`} data-depth={g.depth} className="absolute leading-none" style={{ left: `${g.x}%`, top: `${g.y}%`, fontSize: g.size, transform: g.rot ? `rotate(${g.rot}deg)` : undefined }}>
          {g.ch}
        </span>
      ))}
      {p.rows.map((r, i) => (
        <span key={`r${i}`} data-depth={r.depth} className="absolute whitespace-nowrap leading-none tracking-[0.35em]" style={{ left: `${r.x}%`, top: `${r.y}%`, fontSize: r.size, opacity: 1.6 }}>
          {r.text}
        </span>
      ))}
    </div>
  )
}
