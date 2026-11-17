/**
 * "From the workshop": the maâlem's videos and the workshop's Instagram posts
 * (src/data/workshop.ts). Videos play muted while on screen and pause when
 * they leave it; Instagram's embed script is loaded only when there are posts
 * and the section comes near.
 */
import { useEffect, useRef, useState } from 'react'
import { INSTAGRAM_HANDLE, WORKSHOP_MEDIA, type WorkshopItem } from '../../data/workshop'
import { useT } from '../../lib/i18n'
import { track } from '../../lib/analytics'
import { prefersReducedMotion } from '../../lib/device'

type Instgrm = { Embeds: { process: () => void } }
let igScript: Promise<void> | null = null
function loadInstagram() {
  if (!igScript) {
    igScript = new Promise((resolve, reject) => {
      const s = document.createElement('script')
      s.src = 'https://www.instagram.com/embed.js'
      s.async = true
      s.onload = () => resolve()
      s.onerror = () => {
        igScript = null
        reject(new Error('instagram'))
      }
      document.body.appendChild(s)
    })
  }
  return igScript.then(() => (window as unknown as { instgrm?: Instgrm }).instgrm?.Embeds.process())
}

function VideoTile({ item }: { item: Extract<WorkshopItem, { kind: 'video' }> }) {
  const t = useT()
  const ref = useRef<HTMLVideoElement>(null)
  const counted = useRef(false)
  useEffect(() => {
    const v = ref.current!
    if (prefersReducedMotion()) return
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? v.play().catch(() => {}) : v.pause()), { threshold: 0.5 })
    io.observe(v)
    return () => io.disconnect()
  }, [])
  return (
    <figure className="flex flex-col">
      <div className="relative aspect-[4/5] overflow-hidden bg-forest">
        <video
          ref={ref}
          src={item.src}
          poster={item.poster}
          muted
          loop
          playsInline
          controls
          preload="none"
          className="absolute inset-0 h-full w-full object-cover"
          onPlay={() => {
            if (counted.current) return
            counted.current = true
            track('workshop_video_play', { src: item.src })
          }}
        />
      </div>
      <figcaption className="mt-3 text-[13px] text-ivory/60">{t(item.caption)}</figcaption>
    </figure>
  )
}

function InstagramTile({ url }: { url: string }) {
  return (
    <div className="flex justify-center overflow-hidden bg-ivory/[0.03] [&_iframe]:!min-w-0 [&_iframe]:!max-w-full">
      <blockquote className="instagram-media m-0 w-full" data-instgrm-permalink={url} data-instgrm-version="14" style={{ background: '#fff', border: 0, margin: 0, minWidth: 0, width: '100%' }}>
        <a href={url} target="_blank" rel="noopener noreferrer" className="block p-6 text-center text-[13px] text-emerald">
          Instagram ↗
        </a>
      </blockquote>
    </div>
  )
}

function Placeholder({ i }: { i: number }) {
  const t = useT()
  return (
    <figure className="flex flex-col">
      <div className="relative grid aspect-[4/5] place-items-center border border-dashed border-ivory/15 bg-forest/40">
        <div className="flex flex-col items-center gap-4 px-6 text-center">
          <svg viewBox="0 0 24 24" className="h-10 w-10 text-brass/70" fill="none" stroke="currentColor" strokeWidth="1.2">
            <circle cx="12" cy="12" r="10" />
            <path d="M10 8.5v7l6-3.5z" fill="currentColor" stroke="none" />
          </svg>
          <span className="label text-[10px] text-ivory/45">{t({ en: 'Video to be supplied', fr: 'Vidéo à fournir', ar: 'فيديو سيُضاف لاحقًا' })}</span>
        </div>
      </div>
      <figcaption className="mt-3 text-[13px] text-ivory/40">
        {
          [
            t({ en: 'The maâlem plays a finished guembri', fr: 'Le maâlem joue un guembri achevé', ar: 'المعلّم يعزف على كَمبري مكتمل' }),
            t({ en: 'Stretching the camel skin', fr: 'La tension de la peau de dromadaire', ar: 'شدّ جلد الجمل' }),
            t({ en: 'Tuning the three strings', fr: 'L’accord des trois cordes', ar: 'دوزنة الأوتار الثلاثة' }),
          ][i % 3]
        }
      </figcaption>
    </figure>
  )
}

export function WorkshopSection() {
  const t = useT()
  const root = useRef<HTMLElement>(null)
  const [near, setNear] = useState(false)
  const hasInstagram = WORKSHOP_MEDIA.some((m) => m.kind === 'instagram')

  useEffect(() => {
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), { rootMargin: '600px 0px' })
    io.observe(root.current!)
    return () => io.disconnect()
  }, [])
  useEffect(() => {
    if (near && hasInstagram) loadInstagram().catch(() => {})
  }, [near, hasInstagram])

  const items = WORKSHOP_MEDIA
  return (
    <section ref={root} id="workshop" data-nav="dark" className="relative bg-ink px-gutter py-24 sm:py-32" aria-labelledby="workshop-title">
      <div className="flex flex-wrap items-end justify-between gap-8">
        <div className="max-w-2xl">
          <p className="label text-sand/80">{t({ en: 'V · The workshop', fr: 'V · L’atelier', ar: 'V · الورشة' })}</p>
          <h2 id="workshop-title" className="display mt-6 text-[length:var(--fs-h2)] leading-[0.95] text-ivory">
            {t({ en: 'In the hands', fr: 'Entre les mains', ar: 'بين يدي' })} <span className="italic text-beige">{t({ en: 'of the maâlem.', fr: 'du maâlem.', ar: 'المعلّم.' })}</span>
          </h2>
          <p className="mt-6 max-w-lg text-[15px] leading-relaxed text-ivory/65">
            {t({
              en: 'Each instrument is shaped, skinned and tuned by hand, then played before it leaves the workshop.',
              fr: 'Chaque instrument est façonné, tendu de peau et accordé à la main, puis joué avant de quitter l’atelier.',
              ar: 'تُصنع كل آلة ويُشدّ جلدها وتُدوزن باليد، ثم يُعزف عليها قبل أن تغادر الورشة.',
            })}
          </p>
        </div>
        {INSTAGRAM_HANDLE && (
          <a
            href={`https://www.instagram.com/${INSTAGRAM_HANDLE}/`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track('instagram_follow_click')}
            className="label flex items-center gap-3 border border-gold/60 px-6 py-3 text-ivory hover:bg-gold/10"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
              <rect x="3" y="3" width="18" height="18" rx="5" />
              <circle cx="12" cy="12" r="4" />
              <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
            </svg>
            @{INSTAGRAM_HANDLE}
          </a>
        )}
      </div>

      <div className="mt-14 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {items.length
          ? items.map((m, i) => (m.kind === 'video' ? <VideoTile key={i} item={m} /> : <InstagramTile key={i} url={m.url} />))
          : [0, 1, 2].map((i) => <Placeholder key={i} i={i} />)}
      </div>
    </section>
  )
}
