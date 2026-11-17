import { useEffect, useRef } from 'react'
import { gsap } from '../lib/scroll'
import { prefersReducedMotion, isTouchDevice } from '../lib/device'
import { PHOTOS, type PhotoKey } from '../data/media'
import { Photo, CreditLine } from './ui/Photo'

/**
 * Editorial photograph: the frame opens from a narrow slit as it enters the
 * viewport (clip-path reveal), the image inside drifts gently with scroll, and
 * the caption carries the photographer's credit and licence.
 */
export function Figure({
  k,
  className = '',
  aspect = 'aspect-[4/5]',
  parallax = 8,
  sizes = '(min-width: 768px) 45vw, 100vw',
  from = 'bottom',
  tone = 'light',
}: {
  k: PhotoKey
  className?: string
  aspect?: string
  parallax?: number
  sizes?: string
  /** direction the reveal opens from */
  from?: 'bottom' | 'left' | 'right'
  tone?: 'light' | 'dark'
}) {
  const wrap = useRef<HTMLDivElement>(null)
  const inner = useRef<HTMLDivElement>(null)
  const p = PHOTOS[k]

  useEffect(() => {
    if (prefersReducedMotion()) return
    const start = { bottom: 'inset(100% 0% 0% 0%)', left: 'inset(0% 100% 0% 0%)', right: 'inset(0% 0% 0% 100%)' }[from]
    const ctx = gsap.context(() => {
      gsap.fromTo(
        wrap.current,
        { clipPath: start },
        { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.6, ease: 'expo.inOut', scrollTrigger: { trigger: wrap.current, start: 'top 82%' } },
      )
      gsap.fromTo(inner.current, { scale: 1.18 }, { scale: 1.04, duration: 2.2, ease: 'expo.out', scrollTrigger: { trigger: wrap.current, start: 'top 82%' } })
      // scroll parallax is lighter on touch devices
      const amount = isTouchDevice() ? parallax * 0.4 : parallax
      gsap.fromTo(inner.current, { yPercent: -amount }, {
        yPercent: amount,
        ease: 'none',
        scrollTrigger: { trigger: wrap.current, start: 'top bottom', end: 'bottom top', scrub: true },
      })
    })
    return () => ctx.revert()
  }, [parallax, from])

  return (
    <figure className={className}>
      <div ref={wrap} className={`relative overflow-hidden ${aspect} ${tone === 'light' ? 'bg-sand/40' : 'bg-forest'}`}>
        <div ref={inner} className="absolute inset-x-0 -inset-y-[12%]">
          <Photo k={k} sizes={sizes} />
        </div>
      </div>
      <figcaption className={`mt-3 flex items-start gap-3 ${tone === 'light' ? 'text-moss' : 'text-beige/60'}`}>
        <span className="mt-[7px] h-px w-5 shrink-0 bg-current opacity-60" />
        <CreditLine caption={p.caption} credit={p.credit} />
      </figcaption>
    </figure>
  )
}
