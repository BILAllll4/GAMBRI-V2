/**
 * PAGE 1 — CINEMATIC INTRODUCTION
 * A slow film made of real photographs of Gnawa musicians (Wikimedia Commons,
 * credited on screen): each frame drifts (Ken Burns) and cross-fades into the
 * next under an emerald grade. Minimal title, a single scroll cue. Scrolling
 * pushes the film back and dissolves into the editorial page.
 */
import { useEffect, useRef, useState } from 'react'
import { INTRO_FRAMES, INTRO_VIDEOS, PHOTOS } from '../../data/media'
import { Photo, CreditLine } from '../../components/ui/Photo'
import { gsap } from '../../lib/scroll'
import { prefersReducedMotion } from '../../lib/device'
import { TifinaghField } from '../../components/TifinaghField'
import { useT } from '../../lib/i18n'
import { isRevealed, onReveal } from '../../preload/store'

const FRAME_MS = 7000
const KB = ['kb-a', 'kb-b', 'kb-c', 'kb-d']

function PhotoFilm({ playing }: { playing: boolean }) {
  const [i, setI] = useState(0)
  useEffect(() => {
    if (!playing || prefersReducedMotion()) return
    const t = window.setInterval(() => setI((n) => (n + 1) % INTRO_FRAMES.length), FRAME_MS)
    return () => window.clearInterval(t)
  }, [playing])

  return (
    <>
      {INTRO_FRAMES.map((k, n) => {
        const on = n === i
        const prev = n === (i - 1 + INTRO_FRAMES.length) % INTRO_FRAMES.length
        return (
          <div
            key={k}
            className="absolute inset-0 transition-opacity duration-[2200ms] ease-in-out"
            style={{ opacity: on ? 1 : 0, zIndex: on ? 2 : prev ? 1 : 0 }}
            aria-hidden={!on}
          >
            {/* remounting the inner node restarts its drift each time it comes back */}
            <div
              key={on || prev ? `${k}-${i}` : k}
              className={`kb absolute inset-0`}
              style={{ animationName: on || prev ? KB[n % KB.length] : 'none', animationDuration: `${FRAME_MS + 2400}ms`, animationPlayState: playing ? 'running' : 'paused' }}
            >
              <Photo k={k} eager sizes="100vw" />
            </div>
          </div>
        )
      })}
      {/* credit for the frame on screen */}
      <p className="absolute bottom-24 right-[var(--gutter)] z-10 max-w-[70%] sm:bottom-5 sm:max-w-[46ch] text-right text-ivory/45" data-intro-fade>
        <CreditLine caption={PHOTOS[INTRO_FRAMES[i]].caption} credit={PHOTOS[INTRO_FRAMES[i]].credit} />
      </p>
    </>
  )
}

export function IntroSection() {
  const t = useT()
  const root = useRef<HTMLElement>(null)
  const film = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => setVisible(e.isIntersecting))
    obs.observe(root.current!)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    const reduced = prefersReducedMotion()
    let offReveal = () => {}
    const ctx = gsap.context(() => {
      // the opening plays when the loading screen lifts, not underneath it
      const tl = gsap.timeline({ delay: 0.2, paused: !isRevealed() })
      tl.from('[data-intro-film]', { opacity: 0, duration: 2.4, ease: 'power2.out' })
        .from('[data-letter]', { yPercent: 110, duration: 1.6, ease: 'expo.out', stagger: 0.07 }, '-=1.7')
        .from('[data-intro-line] > span', { yPercent: 105, duration: 1.3, ease: 'expo.out', stagger: 0.12 }, '-=1.1')
        .from('[data-intro-fade]', { opacity: 0, duration: 1.2, ease: 'power2.out', stagger: 0.12 }, '-=0.6')
      if (reduced) tl.progress(1)
      else offReveal = onReveal(() => tl.play())

      if (!reduced) {
        // the film sinks back and darkens; the title lifts and dissolves
        gsap.to(film.current, {
          scale: 1.08,
          yPercent: 12,
          opacity: 0.25,
          ease: 'none',
          scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom top', scrub: true },
        })
        gsap.to('[data-intro-copy]', {
          yPercent: -24,
          opacity: 0,
          ease: 'none',
          scrollTrigger: { trigger: root.current, start: 'top top', end: '65% top', scrub: true },
        })
      }
    }, root)
    return () => {
      offReveal()
      ctx.revert()
    }
  }, [])

  return (
    <section ref={root} id="intro" data-nav="dark" data-nav-clear className="relative h-[100svh] min-h-[600px] w-full overflow-hidden bg-ink" aria-label="Introduction">
      {/* oversized Tifinagh letterforms drifting over the film */}
      <TifinaghField preset="hero" tone="light" opacity={0.07} className="z-[2]" />
      <div ref={film} className="absolute inset-0 will-change-transform">
        <div data-intro-film className="grade-emerald absolute inset-0">
          {INTRO_VIDEOS.length ? (
            <video src={INTRO_VIDEOS[0]} muted playsInline autoPlay loop className="h-full w-full object-cover" aria-hidden />
          ) : (
            <PhotoFilm playing={visible} />
          )}
        </div>
      </div>

      <div data-intro-copy className="relative z-10 flex h-full flex-col items-center justify-center px-gutter text-center">
        <p data-intro-fade className="label mb-6 text-sand/80 sm:mb-8">{t({ en: 'Morocco · The music of the Gnawa', fr: 'Maroc · La musique des Gnaoua', ar: 'المغرب · موسيقى كناوة' })}</p>
        <h1 dir="ltr" className="display flex overflow-hidden text-[length:var(--fs-hero)] leading-[0.85] tracking-[0.06em] text-ivory" aria-label="GNAWA">
          {'GNAWA'.split('').map((c, i) => (
            <span key={i} data-letter className="inline-block" aria-hidden>
              {c}
            </span>
          ))}
        </h1>
        <p data-intro-line className="mask mt-5 sm:mt-7">
          <span className="display text-[clamp(24px,3.2vw,46px)] italic leading-tight text-beige">{t({ en: 'The rhythm of an ancient soul.', fr: 'Le rythme d’une âme ancienne.', ar: 'إيقاع روح عريقة.' })}</span>
        </p>
      </div>

      <div data-intro-fade className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-3 text-ivory/50">
        <span className="label">{t({ en: 'Scroll', fr: 'Défiler', ar: 'مرّر' })}</span>
        <span className="scroll-cue" aria-hidden />
      </div>
    </section>
  )
}
