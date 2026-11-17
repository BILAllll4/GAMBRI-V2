import { lazy, Suspense, useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { Nav } from './components/Nav'
import { Curtain, useTransitionNavigate } from './components/Curtain'
import { CartDrawer } from './components/CartDrawer'
import { Logo } from './components/Logo'
import { Preloader } from './components/Preloader'
import { startSmoothScroll, stopSmoothScroll, ScrollTrigger } from './lib/scroll'
import { useDocumentLang, useT } from './lib/i18n'
import { initAnalytics, pageview } from './lib/analytics'
import { ConsentBanner } from './components/ConsentBanner'

const Experience = lazy(() => import('./pages/Experience'))
const StorePage = lazy(() => import('./pages/store/StorePage'))
const ProductPage = lazy(() => import('./pages/store/ProductPage'))
const CartPage = lazy(() => import('./pages/store/CartPage'))
const CheckoutPage = lazy(() => import('./pages/store/CheckoutPage'))
const OrderPage = lazy(() => import('./pages/store/OrderPage'))
const RenderPage = lazy(() => import('./pages/RenderPage'))
const AdminReviewsPage = lazy(() => import('./pages/admin/AdminReviewsPage'))

function Footer() {
  const go = useTransitionNavigate()
  const t = useT()
  return (
    <footer data-nav="dark" className="border-t border-ivory/10 bg-ink px-4 py-14 sm:px-8">
      <div className="flex flex-col justify-between gap-10 md:flex-row md:items-end">
        <div>
          <Logo className="text-ivory" />
          <p className="display mt-6 max-w-sm text-2xl italic text-beige/80">{t({ en: 'Rooted in ritual, open to new terrain.', fr: 'Ancré dans le rituel, ouvert à de nouveaux horizons.', ar: 'متجذّر في الطقس، منفتح على آفاق جديدة.' })}</p>
        </div>
        <nav className="flex flex-wrap gap-x-8 gap-y-3" aria-label="Footer">
          <button className="label text-ivory/55 hover:text-ivory" onClick={() => go('/#guembri')}>{t({ en: 'Play the guembri', fr: 'Jouer du guembri', ar: 'اعزف على الكَمبري' })}</button>
          <button className="label text-ivory/55 hover:text-ivory" onClick={() => go('/store', { tone: 'gold', label: 'The collection' })}>{t({ en: 'Store', fr: 'Boutique', ar: 'المتجر' })}</button>
          <button className="label text-ivory/55 hover:text-ivory" onClick={() => go('/cart')}>{t({ en: 'Cart', fr: 'Panier', ar: 'السلة' })}</button>
          <a className="label text-ivory/55 hover:text-ivory" href="https://ich.unesco.org/en/RL/gnawa-01170" target="_blank" rel="noopener noreferrer">UNESCO ↗</a>
        </nav>
      </div>
      <p className="mt-12 text-[11px] text-ivory/35">
        {t({ en: 'Demo catalogue, synthesized study tones and real-time renders are placeholders. See README for what to supply.', fr: 'Catalogue de démonstration, sons de synthèse et rendus temps réel provisoires. Voir le README pour les éléments à fournir.', ar: 'الكتالوج والنغمات المركّبة والعروض ثلاثية الأبعاد مؤقتة للعرض. راجع ملف README لما يجب توفيره.' })}
      </p>
    </footer>
  )
}

export default function App() {
  const { pathname } = useLocation()
  const renderMode = pathname.startsWith('/render')
  useDocumentLang()

  useEffect(() => {
    if (renderMode) return
    startSmoothScroll()
    return () => stopSmoothScroll()
  }, [renderMode])

  // one page view per route (after the lazy page has had a moment to set itself up)
  useEffect(() => {
    if (renderMode) return
    initAnalytics()
    const t = window.setTimeout(pageview, 50)
    return () => window.clearTimeout(t)
  }, [pathname, renderMode])

  // recalculate scroll-driven layouts after every route change
  useEffect(() => {
    const t = window.setTimeout(() => ScrollTrigger.refresh(), 500)
    return () => window.clearTimeout(t)
  }, [pathname])

  if (renderMode && import.meta.env.DEV) {
    return (
      <Suspense fallback={null}>
        <Routes>
          <Route path="/render/:shot" element={<RenderPage />} />
        </Routes>
      </Suspense>
    )
  }

  return (
    <div className="grain relative min-h-screen">
      <Nav />
      <main>
        <Suspense fallback={<div className="min-h-screen bg-olive" />}>
          <Routes>
            <Route path="/" element={<Experience />} />
            <Route path="/store" element={<StorePage />} />
            <Route path="/store/:slug" element={<ProductPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/order/:reference" element={<OrderPage />} />
            <Route path="/admin/reviews" element={<AdminReviewsPage />} />
            <Route
              path="*"
              element={
                <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-olive text-center">
                  <p className="display text-6xl text-ivory">Lost in the medina.</p>
                  <a href="/" className="label text-gold">Back to the start</a>
                </div>
              }
            />
          </Routes>
        </Suspense>
      </main>
      <Footer />
      <CartDrawer />
      <Curtain />
      <Preloader />
      <ConsentBanner />
    </div>
  )
}
