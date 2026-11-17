/**
 * Smooth scrolling (Lenis) driven by GSAP's ticker so ScrollTrigger and Lenis
 * share one clock. Disabled for prefers-reduced-motion (native scrolling).
 */
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { prefersReducedMotion } from './device'

gsap.registerPlugin(ScrollTrigger)

let lenis: Lenis | null = null
let tick: ((t: number) => void) | null = null

export function startSmoothScroll() {
  if (lenis || prefersReducedMotion()) return
  lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 0.9, autoRaf: false })
  lenis.on('scroll', ScrollTrigger.update)
  if (import.meta.env.DEV) (window as unknown as { __lenis?: Lenis }).__lenis = lenis // QA scripts drive the scroll
  tick = (t: number) => lenis?.raf(t * 1000)
  gsap.ticker.add(tick)
  gsap.ticker.lagSmoothing(0)
}

export function stopSmoothScroll() {
  if (tick) gsap.ticker.remove(tick)
  lenis?.destroy()
  lenis = null
  tick = null
}

/** scroll to an element / selector / pixel offset, smoothly when available */
export function scrollToTarget(target: string | HTMLElement | number, opts: { offset?: number; immediate?: boolean; duration?: number } = {}) {
  if (lenis) {
    // Lenis caches the scroll limit; re-measure so a jump right after layout changes isn't clamped short
    lenis.resize()
    lenis.scrollTo(target, { offset: opts.offset ?? 0, immediate: opts.immediate, duration: opts.duration ?? 1.6 })
    return
  }
  const el = typeof target === 'string' ? document.querySelector<HTMLElement>(target) : typeof target === 'number' ? null : target
  const top = typeof target === 'number' ? target : el ? el.getBoundingClientRect().top + window.scrollY + (opts.offset ?? 0) : 0
  window.scrollTo({ top, behavior: opts.immediate || prefersReducedMotion() ? 'auto' : 'smooth' })
}

/** pause page scrolling (e.g. while the guembri is in inspect mode) */
export function setScrollLocked(locked: boolean) {
  if (lenis) locked ? lenis.stop() : lenis.start()
  else document.documentElement.style.overflow = locked ? 'hidden' : ''
}

export { gsap, ScrollTrigger }
