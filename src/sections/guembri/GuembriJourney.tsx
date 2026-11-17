/**
 * GAMBRI V2 — PAGE 3: SELECT YOUR GUEMBRI → ZOOM OUT → ISOLATE → TRANSITION → PLAY
 *
 * Layout of the selection scene, after the reference sketch: one large upright
 * guembri slightly left of centre, three short lines of information at the top
 * right, and along the bottom a row of three small guembris between a left and
 * a right arrow. One sticky stage, ONE canvas (GuembriScene); the scroll drives
 * journey.p and these DOM layers follow through refs.
 */
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ScrollTrigger } from '../../lib/scroll'
import { useGuembri } from '../../store/useGuembri'
import { engine } from '../../audio/engine'
import { stopDemo, stopRecording, usePlayer } from '../../audio/demo'
import { useKeyboard } from '../../hooks/useKeyboard'
import { hasWebGL, isTouchDevice } from '../../lib/device'
import { useT, useLang, type T as Tr } from '../../lib/i18n'
import { OPTIONS } from '../../data/selection'
import { TifinaghField } from '../../components/TifinaghField'
import { Fallback } from './Fallback'
import { NoteLabels } from './NoteLabels'
import { MusicPlayer } from './MusicPlayer'
import { journey, T, travelOf, isolateOf, useSelection, SLOTS } from './journey'

const GuembriScene = lazy(() => import('./GuembriScene').then((m) => ({ default: m.GuembriScene })))

const UI = {
  kicker: { en: 'Select your guembri', fr: 'Choisissez votre guembri', ar: 'اختر كَمبريك' },
  variant: {
    en: 'One 3D guembri, three finishes',
    fr: 'Un guembri 3D, trois finitions',
    ar: 'كَمبري ثلاثي الأبعاد واحد، بثلاثة تشطيبات',
  },
  prev: { en: 'Previous guembri', fr: 'Guembri précédent', ar: 'الكَمبري السابق' },
  next: { en: 'Next guembri', fr: 'Guembri suivant', ar: 'الكَمبري التالي' },
  scroll: { en: 'Scroll to play it', fr: 'Faites défiler pour en jouer', ar: 'مرّر للعزف عليه' },
  loading: { en: 'Stretching the skin…', fr: 'On tend la peau…', ar: 'يُشدّ الجلد…' },
  keys: { en: 'Keys A E Y Q W X C V B N — or touch a string', fr: 'Touches A E Y Q W X C V B N — ou touchez une corde', ar: 'المفاتيح A E Y Q W X C V B N — أو المس وترًا' },
  touchNote: { en: 'Touch a note or a string to play', fr: 'Touchez une note ou une corde', ar: 'المس نغمة أو وترًا للعزف' },
  samples: { en: 'Recorded guembri samples', fr: 'Échantillons de guembri enregistrés', ar: 'عيّنات كَمبري مسجّلة' },
  synth: { en: 'Synthesized study tones, not a recording', fr: 'Sons de synthèse, pas un enregistrement', ar: 'نغمات مركّبة، وليست تسجيلًا' },
  soundOn: { en: 'Sound on', fr: 'Son activé', ar: 'الصوت مفعّل' },
  soundOff: { en: 'Sound off', fr: 'Son coupé', ar: 'الصوت مطفأ' },
} satisfies Record<string, Tr>

/** faint khatam lattice in gold */
const LATTICE = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120' fill='none' stroke='#c9a35c' stroke-width='0.8'><rect x='38' y='38' width='44' height='44'/><rect x='38' y='38' width='44' height='44' transform='rotate(45 60 60)'/><circle cx='60' cy='60' r='9'/><path d='M0 60h22M98 60h22M60 0v22M60 98v22'/></svg>`,
)}")`

const ss = (x: number, a: number, b: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

function SoundToggle() {
  const t = useT()
  const muted = useGuembri((s) => s.muted)
  const toggle = () => {
    useGuembri.getState().set({ muted: !muted })
    engine.applyVolume()
  }
  return (
    <button onClick={toggle} aria-pressed={!muted} className="group flex items-center gap-3 text-ivory/55 transition-colors hover:text-ivory">
      <span className="flex h-3 items-end gap-[3px]" aria-hidden>
        {[0.55, 1, 0.75].map((h, i) => (
          <span key={i} className="w-px bg-gold transition-transform duration-500" style={{ height: '100%', transform: `scaleY(${muted ? 0.15 : h})`, transformOrigin: 'bottom' }} />
        ))}
      </span>
      <span className="label">{t(muted ? UI.soundOff : UI.soundOn)}</span>
    </button>
  )
}

/** top right: the selected guembri, in three short lines */
function Info() {
  const t = useT()
  const index = useSelection((s) => s.index)
  const o = OPTIONS[index]
  return (
    <div className="max-w-[300px]">
      <p className="label flex items-center gap-3 text-[10px] text-gold/85">
        {t(UI.kicker)}
        <span className="h-px w-6 bg-gold/50" />
        <span className="text-ivory/45">{String(index + 1).padStart(2, '0')} / 03</span>
      </p>
      <AnimatePresence mode="wait">
        <motion.div
          key={o.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.2, 0.8, 0.2, 1] } }}
          exit={{ opacity: 0, y: -8, transition: { duration: 0.25 } }}
        >
          <h2 className="display mt-4 text-[clamp(24px,2.4vw,36px)] leading-none text-ivory max-md:mt-2">{t(o.name)}</h2>
          <p className="mt-3 text-[13px] font-light leading-relaxed text-ivory/65 max-md:mt-1.5 max-md:text-[12px]">{t(o.line)}</p>
          <dl className="mt-4 space-y-1.5 border-t border-ivory/10 pt-3 text-[11.5px] max-md:hidden">
            {o.details.map((d) => (
              <div key={d.label.en} className="flex justify-between gap-6">
                <dt className="text-ivory/40">{t(d.label)}</dt>
                <dd className="text-ivory/80">{t(d.value)}</dd>
              </div>
            ))}
          </dl>
        </motion.div>
      </AnimatePresence>
      <p className="mt-4 text-[10.5px] italic text-ivory/35 max-md:mt-2">{t(UI.variant)}</p>
    </div>
  )
}

/** bottom: arrows and the names under the three small 3D guembris (the models themselves are in the canvas) */
function CarouselChrome({ portrait }: { portrait: boolean }) {
  const t = useT()
  const rtl = useLang((s) => s.lang === 'ar')
  const { index, select } = useSelection()
  const slots = portrait ? SLOTS.portrait : SLOTS.landscape
  const step = (d: number) => select(index + d)
  const arrow = (side: 0 | 1) => {
    const d = side === 0 ? -1 : 1
    return (
      <button
        key={side}
        onClick={() => step(rtl ? -d : d)}
        aria-label={t(d < 0 ? UI.prev : UI.next)}
        className="pointer-events-auto absolute grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-gold/30 text-gold/85 transition-colors hover:border-gold hover:bg-gold/10"
        style={{ left: `${slots.arrows[side] * 100}%`, top: `${slots.y * 100}%` }}
      >
        <span aria-hidden className="text-[18px] leading-none">{side === 0 ? '‹' : '›'}</span>
      </button>
    )
  }
  return (
    <div className="pointer-events-none absolute inset-0 z-[6]" dir="ltr">
      {arrow(0)}
      {arrow(1)}
      {OPTIONS.map((o, i) => (
        <button
          key={o.id}
          onClick={() => select(i)}
          aria-pressed={index === i}
          aria-label={t(o.name)}
          className="pointer-events-auto absolute flex -translate-x-1/2 flex-col items-center gap-1.5"
          style={{ left: `${slots.x[i] * 100}%`, top: `calc(${slots.y * 100}% + 9.5vh)` }}
        >
          <span className={`label whitespace-nowrap text-[9px] transition-colors ${index === i ? 'text-gold' : 'text-ivory/40 hover:text-ivory/70'}`}>{portrait ? String(i + 1).padStart(2, '0') : t(o.name)}</span>
          <span className={`h-px transition-all duration-500 ${index === i ? 'w-8 bg-gold' : 'w-3 bg-ivory/20'}`} />
        </button>
      ))}
    </div>
  )
}

export function GuembriJourney() {
  const root = useRef<HTMLElement>(null)
  const hold = useRef<HTMLDivElement>(null)
  const selectUi = useRef<HTMLDivElement>(null)
  const darken = useRef<HTMLDivElement>(null)
  const playUi = useRef<HTMLDivElement>(null)
  const glowPlay = useRef<HTMLDivElement>(null)
  const [near, setNear] = useState(false)
  const [mounted, setMounted] = useState(false)
  // the canvas draws only while the section is on screen (it mounts earlier, via `near`)
  const [visible, setVisible] = useState(false)
  const [portrait, setPortrait] = useState(() => window.innerWidth / window.innerHeight < 0.9)
  const { sectionActive, started, ready, source } = useGuembri()
  const webgl = useMemo(hasWebGL, [])
  const touch = useMemo(isTouchDevice, [])
  const t = useT()
  useKeyboard()

  useEffect(() => {
    void engine.boot()
    const nearObs = new IntersectionObserver(
      ([e]) => {
        setNear(e.isIntersecting)
        if (e.isIntersecting) setMounted(true)
      },
      { rootMargin: '60% 0px 60% 0px' },
    )
    const activeObs = new IntersectionObserver(([e]) => useGuembri.getState().set({ sectionActive: e.intersectionRatio > 0.55 }), { threshold: [0, 0.55, 1] })
    const visObs = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: '0px' })
    nearObs.observe(root.current!)
    visObs.observe(root.current!)
    activeObs.observe(hold.current!)
    const onResize = () => setPortrait(window.innerWidth / window.innerHeight < 0.9)
    window.addEventListener('resize', onResize)
    return () => {
      nearObs.disconnect()
      visObs.disconnect()
      activeObs.disconnect()
      window.removeEventListener('resize', onResize)
    }
  }, [])

  // ← / → choose a guembri while the selection scene is on screen
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!near || journey.p > T.select[1]) return
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
      const rtl = document.documentElement.dir === 'rtl'
      const d = (e.key === 'ArrowRight') !== rtl ? 1 : -1
      const s = useSelection.getState()
      s.select(s.index + d)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [near])

  useEffect(() => {
    const show = (el: HTMLElement | null, o: number) => {
      if (!el) return
      el.style.opacity = o.toFixed(3)
      el.style.visibility = o > 0.01 ? 'visible' : 'hidden'
    }
    const apply = (p: number) => {
      journey.p = p
      // the information and the carousel chrome leave as the scene zooms out
      show(selectUi.current, 1 - ss(p, T.zoomOut[0], T.zoomOut[0] + 0.1))
      // isolation: the room closes in around the chosen guembri, then opens for playing
      const iso = isolateOf(p)
      const travel = travelOf(p)
      if (darken.current) darken.current.style.opacity = String(iso * (1 - travel * 0.65))
      if (glowPlay.current) glowPlay.current.style.opacity = String(travel)
      if (playUi.current) {
        const o = ss(p, T.travel[1] - 0.02, T.travel[1] + 0.04)
        playUi.current.style.opacity = String(o)
        playUi.current.style.display = o > 0.02 ? 'block' : 'none'
      }
    }
    apply(0)
    const st = ScrollTrigger.create({
      trigger: root.current,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (s) => apply(s.progress),
      onRefresh: (s) => apply(s.progress),
    })
    return () => st.kill()
  }, [])

  useEffect(() => {
    if (sectionActive) return
    if (useGuembri.getState().demo) stopDemo()
    stopRecording()
    usePlayer.setState({ open: false })
  }, [sectionActive])

  return (
    <section ref={root} id="guembri-intro" data-nav="dark" data-nav-clear className="relative h-[650svh] bg-[#050b08]" aria-label={t(UI.kicker)}>
      <div className="sticky top-0 h-[100svh] w-full overflow-hidden">
        {/* ground: black and deep forest green, faint gold lattice, Tifinagh lettering */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_42%_38%,#123024_0%,#09170f_52%,#030705_100%)]" />
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.045]" style={{ backgroundImage: LATTICE, backgroundSize: '120px 120px' }} />
        <TifinaghField preset="intro" tone="light" opacity={0.03} />
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_30%_48%_at_42%_40%,rgba(214,163,90,.18)_0%,rgba(214,163,90,0)_70%)] max-md:bg-[radial-gradient(ellipse_70%_35%_at_50%_30%,rgba(214,163,90,.18)_0%,rgba(214,163,90,0)_70%)]" />
        {/* isolation: everything but a pool of light around the instrument falls to black */}
        <div ref={darken} aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_34%_52%_at_50%_50%,rgba(3,7,5,0)_0%,rgba(3,7,5,.85)_70%,#030705_100%)] opacity-0" />
        <div ref={glowPlay} aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_50%,rgba(240,214,170,.18)_0%,rgba(240,214,170,0)_72%)] opacity-0" />

        <div className="absolute inset-0">
          {webgl ? (
            mounted && (
              <Suspense fallback={null}>
                <GuembriScene active={near && visible} />
              </Suspense>
            )
          ) : (
            <Fallback />
          )}
        </div>

        {/* ---------------- SELECT: information (top right) and carousel chrome (bottom) ---------------- */}
        <div ref={selectUi} className="pointer-events-none absolute inset-0">
          <div className="pointer-events-auto absolute z-[6] max-md:left-[var(--gutter)] max-md:right-[var(--gutter)] max-md:top-[50svh] md:top-[16vh] md:ltr:right-[6vw] md:rtl:left-[6vw]">
            <Info />
          </div>
          <CarouselChrome portrait={portrait} />
          <p className="label pointer-events-none absolute bottom-5 flex items-center gap-3 text-[9px] text-ivory/40 max-md:hidden ltr:right-[6vw] rtl:left-[6vw]">
            <span className="scroll-cue scale-[0.6]" aria-hidden />
            {t(UI.scroll)}
          </p>
        </div>

        {/* ---------------- PLAY ---------------- */}
        <div ref={playUi} className="absolute inset-0" style={{ opacity: 0, display: 'none' }}>
          {webgl && mounted && <NoteLabels />}
          <motion.p animate={{ opacity: started ? 0.45 : 0.8 }} transition={{ duration: 1.2 }} className="label pointer-events-none absolute inset-x-0 top-24 z-20 px-gutter text-center text-ivory sm:top-28">
            {t(touch ? UI.touchNote : UI.keys)}
          </motion.p>
          <footer className="absolute inset-x-0 bottom-0 z-20 flex items-center justify-between px-gutter pb-5 sm:pb-7">
            <p className="credit max-w-[30ch] text-ivory/40">{t(source === 'samples' ? UI.samples : UI.synth)}</p>
            <div className="flex items-center gap-5 sm:gap-7">
              <MusicPlayer />
              <SoundToggle />
            </div>
          </footer>
        </div>

        <AnimatePresence>
          {webgl && mounted && !ready && (
            <motion.div className="pointer-events-none absolute inset-0 z-10 grid place-items-center bg-[#050b08]" exit={{ opacity: 0, transition: { duration: 1.1 } }}>
              <p className="label text-ivory/50">{t(UI.loading)}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div ref={hold} id="guembri" data-guembri-section className="pointer-events-none absolute inset-x-0 bottom-0 h-[100svh]" aria-hidden />
    </section>
  )
}
