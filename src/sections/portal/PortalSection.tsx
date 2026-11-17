/**
 * PAGE 4 — THE PORTAL & THE SHOWROOM
 * A tall scroll track with a sticky 3D scene. Scroll progress drives the camera
 * toward a horseshoe-arch doorway; the carved doors open onto a warm room where
 * three display cards stand, each with a 3D guembri, its name, price and one
 * line (PortalShowroom). The camera walks in and stops; the showroom then holds
 * for a long stretch of scroll as a finished, interactive scene (hover turns an
 * instrument, click opens it). Nothing fades it out: when the track ends the
 * stage scrolls up like a page and the Full Collection follows directly below,
 * with only a light emerald veil settling over the room as it leaves.
 */
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { gsap } from '../../lib/scroll'
import { hasWebGL, prefersReducedMotion } from '../../lib/device'
import { api, formatMAD } from '../../lib/api'
import { SHOWROOM } from '../../data/showroom'
import { ArchOutline } from '../../components/Ornaments'
import { useTransitionNavigate } from '../../components/Curtain'
import type { CardLabel, ShowpieceItem } from './PortalShowroom'
import { useT, type T } from '../../lib/i18n'

/** one line per showroom piece, in three languages */
const LINES: Record<string, T> = {
  'guembri-practice': { en: 'For learning the repertoire at home.', fr: 'Pour apprendre le répertoire chez soi.', ar: 'لتعلّم الريبرتوار في البيت.' },
  'guembri-workshop-edition': { en: 'Carved body, camel-skin soundboard, dark-stained wood.', fr: 'Caisse sculptée, table en peau de dromadaire, bois teinté foncé.', ar: 'صندوق منحوت، وجه من جلد الجمل، وخشب مصبوغ داكن.' },
  'collectors-guembri-numbered': { en: 'A numbered piece with a certificate.', fr: 'Une pièce numérotée avec certificat.', ar: 'قطعة مرقّمة مع شهادة.' },
}

const PortalScene = lazy(() => import('./PortalScene').then((m) => ({ default: m.PortalScene })))

const fallback: ShowpieceItem[] = SHOWROOM.map((s) => ({ slug: s.slug, finish: s.finish, name: s.name, price: formatMAD(s.price), line: s.line }))

export function PortalSection() {
  const root = useRef<HTMLElement>(null)
  const progress = useRef(0)
  const [near, setNear] = useState(false)
  // drawn only while on screen; `near` (half a screen early) only mounts and preloads it
  const [visible, setVisible] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [items, setItems] = useState(fallback)
  const t = useT()
  // the card lines follow the chosen language
  const shown = useMemo(() => items.map((it) => ({ ...it, line: LINES[it.slug] ? t(LINES[it.slug]) : it.line })), [items, t])
  const webgl = useMemo(hasWebGL, [])
  const go = useTransitionNavigate()
  // the cards' text blocks are plain DOM over the canvas; the scene places them on their cards each frame
  const labels = useMemo<CardLabel[]>(() => [0, 1, 2].map(() => ({ el: null, hover: { current: false } })), [])
  const open = useCallback((slug: string, name: string) => go(`/store/${slug}`, { tone: 'gold', label: name }), [go])

  // live names / prices / lines from the store when the API is running
  useEffect(() => {
    api
      .products()
      .then((all) =>
        setItems(
          SHOWROOM.map((s) => {
            const p = all.find((x) => x.slug === s.slug)
            if (!p) return fallback.find((f) => f.slug === s.slug)!
            const delta = p.variants.find((v) => v.name === s.variant)?.priceDelta ?? 0
            return { slug: s.slug, finish: s.finish, name: p.name, price: formatMAD(p.price + delta), line: s.line }
          }),
        ),
      )
      .catch(() => {})
  }, [])

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => {
        setNear(e.isIntersecting)
        if (e.isIntersecting) setMounted(true)
      },
      { rootMargin: '50% 0px 50% 0px' },
    )
    const vis = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: '0px' })
    obs.observe(root.current!)
    vis.observe(root.current!)
    return () => {
      obs.disconnect()
      vis.disconnect()
    }
  }, [])

  useEffect(() => {
    const reduced = prefersReducedMotion()
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: root.current,
          start: 'top top',
          end: 'bottom bottom',
          scrub: reduced ? true : 0.8,
          onUpdate: (st) => (progress.current = st.progress),
        },
      })
      // timeline spans 0..1 to match scroll progress (phases in PortalScene)
      tl.fromTo('[data-p-kicker]', { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.06 }, 0.03)
        .fromTo('[data-p-title] > span > span', { yPercent: 110 }, { yPercent: 0, duration: 0.1, stagger: 0.03 }, 0.05)
        .to('[data-p-copy]', { opacity: 0, y: -30, duration: 0.1 }, 0.3)
        // the green that joins this section to the guembri section clears as the gate comes closer
        .to('[data-p-join]', { opacity: 0, duration: 0.14 }, 0.02)
        .fromTo('[data-p-hint]', { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.06 }, 0.7)
        .set({}, {}, 1)

      // leaving: the stage scrolls up with the page while a light veil settles over it
      gsap.fromTo(
        '[data-p-veil]',
        { opacity: 0 },
        { opacity: 0.55, ease: 'none', scrollTrigger: { trigger: root.current, start: 'bottom bottom', end: 'bottom 35%', scrub: true } },
      )
    }, root)
    return () => ctx.revert()
  }, [])

  return (
    <section ref={root} id="portal" data-nav="dark" data-nav-clear className="relative h-[380vh] bg-ink" aria-label="The portal and the showroom">
      <div className="sticky top-0 h-[100svh] w-full overflow-hidden">
        <div className="absolute inset-0">
          {webgl && mounted ? (
            <Suspense fallback={null}>
              <PortalScene progress={progress} active={near && visible} items={shown} labels={labels} onOpen={open} />
            </Suspense>
          ) : (
            <div className="flex h-full items-center justify-center">
              <ArchOutline className="h-[60vh] text-brass/60" />
            </div>
          )}
        </div>

        {/* joins the evening sky to the guembri section above: same deep green, fading down */}
        <div data-p-join aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-[5] h-[30%] bg-[linear-gradient(to_bottom,#0d2a20_0%,rgba(13,42,32,0.6)_45%,rgba(13,42,32,0)_100%)]" />

        {/* name, price and one line of each card, placed over its panel by the scene */}
        <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
          {shown.slice(0, 3).map((it, i) => (
            <div
              key={it.slug}
              ref={(el) => {
                labels[i].el = el
              }}
              className="portal-card-info absolute left-0 top-0"
              style={{ opacity: 0, visibility: 'hidden' }}
              onPointerEnter={() => (labels[i].hover.current = true)}
              onPointerLeave={() => (labels[i].hover.current = false)}
            >
              <a
                href={`/store/${it.slug}`}
                onClick={(e) => {
                  e.preventDefault()
                  open(it.slug, it.name)
                }}
              >
                <span className="pc-index">{String(i + 1).padStart(2, '0')}</span>
                <span className="pc-name">{it.name}</span>
                <span className="pc-line">{it.line}</span>
                <span className="pc-price">{it.price}</span>
              </a>
            </div>
          ))}
        </div>

        {/* title over the approaching doorway */}
        <div data-p-copy className="pointer-events-none absolute inset-x-0 top-[13%] flex flex-col items-center px-gutter text-center" style={{ textShadow: '0 2px 28px rgba(0,0,0,.75), 0 1px 4px rgba(0,0,0,.6)' }}>
          <p data-p-kicker className="label text-sand/80">{t({ en: 'IV · The portal', fr: 'IV · Le portail', ar: 'IV · البوابة' })}</p>
          <h2 data-p-title className="display mt-6 text-[length:var(--fs-h2)] leading-[0.95] text-ivory">
            <span className="mask"><span>{t({ en: 'Step through', fr: 'Franchissez', ar: 'اعبر' })}</span></span>
            <span className="mask"><span className="italic text-beige">{t({ en: 'the door.', fr: 'la porte.', ar: 'الباب.' })}</span></span>
          </h2>
        </div>

        {/* once inside: what the room is, and that the collection continues below */}
        <div data-p-hint className="pointer-events-none absolute inset-x-0 bottom-5 z-[35] flex items-center justify-center gap-4 px-gutter text-center opacity-0 sm:bottom-7">
          <span className="label text-[10px] text-emerald/70">{t({ en: 'The showroom', fr: 'Le showroom', ar: 'قاعة العرض' })}</span>
          <span className="h-px w-6 bg-brass/60" />
          <span className="label hidden text-[10px] text-emerald/55 sm:inline">{t({ en: 'Hover an instrument to turn it', fr: 'Survolez un instrument pour le tourner', ar: 'مرّر المؤشر على آلة لتدويرها' })}</span>
          <span className="h-px w-6 bg-brass/60 max-sm:hidden" />
          <button onClick={() => go('/store', { tone: 'gold', label: 'The collection' })} className="label pointer-events-auto text-[10px] text-emerald underline decoration-brass underline-offset-4">{t({ en: 'Full collection', fr: 'Toute la collection', ar: 'المجموعة الكاملة' })} <span className="inline-block rtl:-scale-x-100">→</span></button>
        </div>

        <div data-p-veil className="pointer-events-none absolute inset-0 z-40 bg-emerald opacity-0" />
      </div>
    </section>
  )
}
