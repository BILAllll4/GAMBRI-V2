import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { IntroSection } from '../sections/intro/IntroSection'
import { RitualSection } from '../sections/ritual/RitualSection'
import { GuembriJourney } from '../sections/guembri/GuembriJourney'
import { PortalSection } from '../sections/portal/PortalSection'
import { WorkshopSection } from '../sections/workshop/WorkshopSection'
import { ScrollTrigger, scrollToTarget } from '../lib/scroll'

/**
 * The pages as one continuous scroll: intro → story → guembri (introduction, then playing) → portal & showroom (the full collection is its own page, /store).
 *
 * Page 3 → 4 used to be a pinned GSAP tween that put `filter: blur(12px)` on the
 * guembri canvas, which blurred the 3D instrument (and every DOM layer over it)
 * as the visitor scrolled toward the end of the section. The hand-off is now a
 * plain colour gradient between the sections: nothing is filtered, so the
 * instrument stays sharp until it leaves the screen.
 */
export default function Experience() {
  const { hash } = useLocation()

  useEffect(() => {
    const t = window.setTimeout(() => ScrollTrigger.refresh(), 400)
    return () => window.clearTimeout(t)
  }, [])

  // deep links like /#guembri (from the nav on other routes). The sections above
  // keep growing for a moment after mount (fonts, images, pin spacers), so one
  // early jump lands short: keep re-aiming while the page height settles, and
  // stop as soon as the visitor scrolls on their own.
  useEffect(() => {
    if (!hash) return
    let lastH = 0
    let stopped = false
    const aim = () => {
      if (stopped) return
      const h = document.documentElement.scrollHeight
      if (h !== lastH) {
        lastH = h
        scrollToTarget(hash, { immediate: true })
      }
    }
    const stop = () => (stopped = true)
    const first = window.setTimeout(aim, 120)
    const poll = window.setInterval(aim, 200)
    const end = window.setTimeout(() => {
      window.clearInterval(poll)
      ScrollTrigger.refresh()
    }, 3000)
    window.addEventListener('wheel', stop, { passive: true, once: true })
    window.addEventListener('touchstart', stop, { passive: true, once: true })
    window.addEventListener('keydown', stop, { once: true })
    return () => {
      window.clearTimeout(first)
      window.clearInterval(poll)
      window.clearTimeout(end)
      window.removeEventListener('wheel', stop)
      window.removeEventListener('touchstart', stop)
      window.removeEventListener('keydown', stop)
    }
  }, [hash])

  return (
    <div>
      <IntroSection />
      <RitualSection />
      {/* white introduction → the same 3D instrument settles into the playing scene */}
      <GuembriJourney />
      {/* light instrument room → the dark portal, without filtering anything */}
      <div aria-hidden data-nav="dark" data-nav-clear className="h-[24vh] bg-[linear-gradient(to_bottom,#040906_0%,#0d2a20_100%)]" />
      <PortalSection />
      {/* the maâlem's videos and the workshop's Instagram (src/data/workshop.ts) */}
      <WorkshopSection />
    </div>
  )
}
