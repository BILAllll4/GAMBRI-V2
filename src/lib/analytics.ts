/**
 * Visitor analytics: Plausible and/or Google Analytics 4, each switched on by
 * an env variable (VITE_PLAUSIBLE_DOMAIN, VITE_GA_ID). With neither set,
 * nothing is loaded and every call here is a no-op.
 *
 *  - Plausible is cookieless: it loads straight away, no banner.
 *  - GA4 sets cookies: it loads only after the visitor accepts (ConsentBanner).
 *
 * Page views are sent on every route change (App.tsx), so both tools show
 * where visitors arrive, the path they take and the page they leave from.
 * Store events: add_to_cart, begin_checkout, order_placed, payment_completed,
 * review_submitted, workshop_video_play.
 */
import { create } from 'zustand'

const PLAUSIBLE_DOMAIN = (import.meta.env.VITE_PLAUSIBLE_DOMAIN as string | undefined)?.trim()
const PLAUSIBLE_SRC = (import.meta.env.VITE_PLAUSIBLE_SRC as string | undefined)?.trim() || 'https://plausible.io/js/script.manual.js'
const GA_ID = (import.meta.env.VITE_GA_ID as string | undefined)?.trim()

export const analyticsEnabled = !!(PLAUSIBLE_DOMAIN || GA_ID)
export const needsConsent = !!GA_ID

type Props = Record<string, string | number | boolean>
type W = Window & {
  plausible?: ((e: string, o?: { props?: Props; u?: string }) => void) & { q?: unknown[] }
  dataLayer?: unknown[]
  gtag?: (...args: unknown[]) => void
}
const w = () => window as W

/* ---------- consent (GA only) ---------- */

type Consent = 'granted' | 'denied' | null
const CONSENT_KEY = 'gnawa-consent'
const readConsent = (): Consent => {
  try {
    const v = localStorage.getItem(CONSENT_KEY)
    return v === 'granted' || v === 'denied' ? v : null
  } catch {
    return null
  }
}

export const useConsent = create<{ consent: Consent; set: (c: 'granted' | 'denied') => void }>((set) => ({
  consent: readConsent(),
  set: (c) => {
    try {
      localStorage.setItem(CONSENT_KEY, c)
    } catch {
      /* private mode: the choice lasts for this visit */
    }
    set({ consent: c })
    if (c === 'granted') loadGA()
  },
}))

/* ---------- loaders ---------- */

let gaLoaded = false
function loadGA() {
  if (!GA_ID || gaLoaded) return
  gaLoaded = true
  const s = document.createElement('script')
  s.async = true
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`
  document.head.appendChild(s)
  w().dataLayer = w().dataLayer || []
  w().gtag = function gtag() {
    // gtag needs the real `arguments` object
    // eslint-disable-next-line prefer-rest-params
    w().dataLayer!.push(arguments)
  }
  w().gtag!('js', new Date())
  w().gtag!('config', GA_ID, { send_page_view: false, anonymize_ip: true })
  pageview() // the page the visitor accepted on
}

let started = false
export function initAnalytics() {
  if (started) return
  started = true
  if (PLAUSIBLE_DOMAIN) {
    const queue = function plausible(...args: unknown[]) {
      ;(queue.q = queue.q || []).push(args)
    } as NonNullable<W['plausible']>
    w().plausible = w().plausible || queue
    const s = document.createElement('script')
    s.defer = true
    s.dataset.domain = PLAUSIBLE_DOMAIN
    s.src = PLAUSIBLE_SRC
    document.head.appendChild(s)
  }
  if (GA_ID && readConsent() === 'granted') loadGA()
}

/* ---------- calls ---------- */

export function pageview() {
  w().plausible?.('pageview')
  if (gaLoaded) w().gtag?.('event', 'page_view', { page_location: location.href, page_path: location.pathname + location.search, page_title: document.title })
}

export function track(event: string, props: Props = {}) {
  w().plausible?.(event, { props })
  if (gaLoaded) w().gtag?.('event', event, props)
}
