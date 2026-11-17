import type { ReactNode } from 'react'
import { Khatam } from '../../components/Ornaments'
import { useT } from '../../lib/i18n'
import { C } from '../../lib/copy'

/** shown while the catalogue is sample data (every seeded product has demo = true) */
export function DemoNotice({ className = '' }: { className?: string }) {
  const t = useT()
  return (
    <p className={`flex items-start gap-3 border border-gold/30 bg-gold/5 px-4 py-3 text-[12px] leading-relaxed text-beige/80 ${className}`}>
      <span className="label shrink-0 pt-px text-gold">{t({ en: 'Demo catalogue', fr: 'Catalogue de démonstration', ar: 'كتالوج تجريبي' })}</span>
      <span>{t({ en: 'Products, prices and stock are sample data for testing. Orders placed here are real database records.', fr: 'Produits, prix et stocks sont des données de test. Les commandes passées ici sont de vrais enregistrements.', ar: 'المنتجات والأسعار والمخزون بيانات للاختبار. الطلبات المرسلة هنا سجلات حقيقية.' })}</span>
    </p>
  )
}

export function StoreState({
  loading,
  error,
  retry,
  children,
  tone = 'dark',
}: {
  loading: boolean
  error: Error | null
  retry: () => void
  children: ReactNode
  /** light = emerald text for the ivory pages (collection, cart) */
  tone?: 'dark' | 'light'
}) {
  const ink = tone === 'light' ? 'text-emerald' : 'text-ivory'
  const t = useT()
  if (loading)
    return (
      <div className="flex min-h-[40vh] items-center justify-center" role="status">
        <Khatam className="h-10 w-10 animate-spin text-gold [animation-duration:4s]" />
        <span className="sr-only">{t(C.loading)}</span>
      </div>
    )
  if (error)
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-5 text-center" role="alert">
        <p className={`display text-3xl ${ink}`}>{t(C.closed)}</p>
        <p className={`max-w-md text-sm ${ink} opacity-60`}>{error.message}</p>
        <button onClick={retry} className={`label border border-gold/60 px-6 py-3 ${ink} hover:bg-gold/10`}>
          {t(C.tryAgain)}
        </button>
      </div>
    )
  return <>{children}</>
}
