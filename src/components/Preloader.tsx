/**
 * Full-screen loading screen shown on the first visit to any route.
 *
 * The site renders underneath from the start (so the page is laid out and its
 * first photograph decodes); this screen covers it and blocks scrolling while
 * src/preload/pipeline loads what the first screen needs. The percentage follows
 * the pipeline's real progress — it is only eased toward it, never ahead of it.
 *
 * The guembri line drawing traces itself with the progress and sways in a CSS 3D
 * perspective: no WebGL here, so the screen paints before any 3D code arrives.
 */
import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { Logo } from './Logo'
import { usePreload } from '../preload/store'
import { loadLater, runPreload } from '../preload/pipeline'
import { useT } from '../lib/i18n'
import { prefersReducedMotion } from '../lib/device'
import { ScrollTrigger } from '../lib/scroll'

const TEXT = {
  en: 'Preparing the Gnawa Experience…',
  fr: 'Préparation de l’expérience Gnawa…',
  ar: 'نُهيّئ تجربة كناوة…',
}

const FADE_MS = 900
const HOLD_MS = 280 // a beat at 100% before fading
const STALL_MS = 20000 // no progress at all for this long: open the site anyway (3D sections have fallbacks)

const SCROLL_KEYS = new Set([' ', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'])

let started: Promise<void> | null = null // StrictMode mounts twice; load once

export function Preloader() {
  const phase = usePreload((s) => s.phase)
  const { pathname } = useLocation()
  const path = useRef(pathname).current // the route the visitor arrived on
  const root = useRef<HTMLDivElement>(null)
  const pct = useRef<HTMLSpanElement>(null)
  const bar = useRef<HTMLDivElement>(null)
  const t = useT()

  // run the pipeline
  useEffect(() => {
    if (started) return
    started = runPreload(path, (p) => usePreload.setState({ progress: p }))
      .then(() => {
        usePreload.setState({ progress: 1 })
        usePreload.subscribe((s, prev) => {
          if (s.phase === 'done' && prev.phase !== 'done') loadLater(path)
        })
      })
      .catch((e) => {
        console.warn('[preload] pipeline failed — opening the site', e)
        usePreload.setState({ progress: 1 })
      })
  }, [path])

  // ease the shown number toward the real one; leave once it reaches 100%
  useEffect(() => {
    if (phase !== 'loading') return
    const reduced = prefersReducedMotion()
    let shown = 0
    let raf = 0
    let leaving = 0
    const leave = () => {
      if (usePreload.getState().phase === 'loading') usePreload.setState({ phase: 'leaving' })
    }
    // a stalled network must not lock the site: give up after STALL_MS without any progress
    let last = usePreload.getState().progress
    let lastAt = performance.now()
    const failsafe = window.setInterval(() => {
      const p = usePreload.getState().progress
      if (p !== last) {
        last = p
        lastAt = performance.now()
      } else if (performance.now() - lastAt > STALL_MS) {
        console.warn(`[preload] no progress for ${STALL_MS / 1000}s — opening the site`)
        leave()
      }
    }, 1000)
    const tick = () => {
      const target = usePreload.getState().progress
      shown = reduced ? target : shown + Math.max((target - shown) * 0.09, Math.min(0.004, target - shown))
      if (target - shown < 0.0005) shown = target
      const p = Math.round(shown * 100)
      if (pct.current) pct.current.textContent = String(p)
      if (bar.current) bar.current.style.transform = `scaleX(${shown})`
      root.current?.style.setProperty('--p', shown.toFixed(4))
      root.current?.setAttribute('aria-valuenow', String(p))
      if (shown >= 1 && !leaving) {
        // a short hold at 100% so the finished state reads before the fade
        leaving = window.setTimeout(leave, HOLD_MS)
        return
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      window.clearInterval(failsafe)
      window.clearTimeout(leaving)
    }
  }, [phase])

  // fade out, then unmount and hand the page over
  useEffect(() => {
    if (phase !== 'leaving') return
    const id = window.setTimeout(() => usePreload.setState({ phase: 'done' }), FADE_MS)
    return () => window.clearTimeout(id)
  }, [phase])

  // no scrolling (native or Lenis) underneath the screen
  useEffect(() => {
    if (phase === 'done') return
    const html = document.documentElement
    const prev = html.style.overflow
    html.style.overflow = 'hidden'
    const block = (e: Event) => {
      if (e instanceof KeyboardEvent && !SCROLL_KEYS.has(e.key)) return
      e.preventDefault()
      e.stopImmediatePropagation()
    }
    const opts = { capture: true, passive: false } as const
    window.addEventListener('wheel', block, opts)
    window.addEventListener('touchmove', block, opts)
    window.addEventListener('keydown', block, opts)
    return () => {
      html.style.overflow = prev
      window.removeEventListener('wheel', block, opts)
      window.removeEventListener('touchmove', block, opts)
      window.removeEventListener('keydown', block, opts)
      requestAnimationFrame(() => ScrollTrigger.refresh())
    }
  }, [phase])

  if (phase === 'done') return null

  return (
    <div
      ref={root}
      role="progressbar"
      aria-label={t(TEXT)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={0}
      className="preloader fixed inset-0 z-[200] flex flex-col items-center justify-center bg-olive px-4 text-ivory"
      style={{ opacity: phase === 'leaving' ? 0 : 1, transition: `opacity ${FADE_MS}ms var(--ease-cine)`, pointerEvents: phase === 'leaving' ? 'none' : 'auto' }}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(10,28,21,0.75)_100%)]" />

      <div
        className="relative flex flex-col items-center"
        style={{ transform: phase === 'leaving' ? 'translateY(-10px) scale(0.985)' : 'none', transition: `transform ${FADE_MS}ms var(--ease-cine)` }}
      >
        <GuembriMark />

        <Logo className="mt-8 text-ivory" />

        <p className="label mt-6 text-center text-sage">{t(TEXT)}</p>

        <div className="mt-7 flex w-[min(280px,72vw)] items-center gap-4" dir="ltr">
          <div className="relative h-px flex-1 overflow-hidden bg-ivory/15">
            <div ref={bar} className="absolute inset-0 origin-left bg-brass" style={{ transform: 'scaleX(0)' }} />
          </div>
          <span className="display w-[3.2ch] text-right text-[20px] tabular-nums leading-none text-beige">
            <span ref={pct}>0</span>
            <span className="text-[12px] text-sage">%</span>
          </span>
        </div>
      </div>
    </div>
  )
}

/**
 * A guembri in brass line-work, front and back faces a few pixels apart in depth,
 * swaying in perspective. Its outline traces with `--p` (the progress); the three
 * strings shimmer.
 */
function GuembriMark() {
  return (
    <div aria-hidden className="preloader-stage relative h-[clamp(170px,30vh,260px)] w-[clamp(84px,14vh,124px)]">
      <div className="preloader-sway absolute inset-0">
        <svg viewBox="0 0 120 300" className="absolute inset-0 h-full w-full opacity-25 [transform:translateZ(-14px)]">
          <Outline />
        </svg>
        <svg viewBox="0 0 120 300" className="absolute inset-0 h-full w-full">
          <Outline />
          <g stroke="#e3d6bb" strokeWidth="0.7" strokeLinecap="round" className="preloader-strings">
            <line x1="56" y1="38" x2="52" y2="252" />
            <line x1="60" y1="38" x2="60" y2="252" />
            <line x1="64" y1="38" x2="68" y2="252" />
          </g>
        </svg>
      </div>
      <div className="preloader-shadow absolute -bottom-5 left-1/2 h-3 w-[70%] -translate-x-1/2 rounded-[50%] bg-ink/70 blur-[6px]" />
    </div>
  )
}

const DRAW = { pathLength: 1, strokeDasharray: 1, style: { strokeDashoffset: 'calc(1 - var(--p, 0))' } } as const

function Outline() {
  return (
    <g fill="none" stroke="#a8875a" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round">
      {/* sersera: the metal plate and rings at the neck's head */}
      <path {...DRAW} d="M60 6 L72 18 L60 30 L48 18 Z" />
      <circle cx="44" cy="12" r="2.4" strokeWidth="1" />
      <circle cx="76" cy="12" r="2.4" strokeWidth="1" />
      {/* neck */}
      <path {...DRAW} d="M55 30 L55 168 M65 30 L65 168" />
      {/* leather tuning bindings */}
      <path {...DRAW} d="M53 52 h14 M53 70 h14 M53 88 h14" strokeWidth="2.2" />
      {/* body: a carved trough, rounded at the base */}
      <path {...DRAW} d="M24 168 C22 210 26 262 44 284 C52 292 68 292 76 284 C94 262 98 210 96 168 Z" />
      {/* skin, laced along its edge */}
      <path {...DRAW} d="M30 176 C29 214 32 256 47 276 C54 283 66 283 73 276 C88 256 91 214 90 176 Z" strokeWidth="0.9" />
      {/* bridge */}
      <path {...DRAW} d="M48 252 h24" strokeWidth="2" />
    </g>
  )
}
