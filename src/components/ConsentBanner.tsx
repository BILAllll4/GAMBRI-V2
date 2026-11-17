/** Cookie consent for Google Analytics. Shown only when VITE_GA_ID is set and the visitor has not chosen yet. */
import { needsConsent, useConsent } from '../lib/analytics'
import { useT } from '../lib/i18n'

export function ConsentBanner() {
  const t = useT()
  const { consent, set } = useConsent()
  if (!needsConsent || consent) return null
  return (
    <div role="dialog" aria-label={t({ en: 'Cookies', fr: 'Cookies', ar: 'ملفات تعريف الارتباط' })} className="fixed inset-x-3 bottom-3 z-[90] mx-auto max-w-xl border border-ivory/15 bg-ink px-5 py-4 text-ivory shadow-2xl sm:inset-x-6 sm:bottom-6">
      <p className="text-[13px] leading-relaxed text-ivory/80">
        {t({
          en: 'We would like to measure visits with Google Analytics (cookies) to see which pages help and which lose people. Nothing is sold or shared for advertising.',
          fr: 'Nous aimerions mesurer les visites avec Google Analytics (cookies) pour voir quelles pages aident et lesquelles perdent les visiteurs. Rien n’est vendu ni partagé à des fins publicitaires.',
          ar: 'نودّ قياس الزيارات عبر Google Analytics (ملفات تعريف الارتباط) لمعرفة الصفحات المفيدة والصفحات التي يغادر منها الزوار. لا نبيع أي بيانات ولا نشاركها لأغراض إعلانية.',
        })}
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button onClick={() => set('granted')} className="label bg-gold px-5 py-3 text-olive hover:bg-[#c39a5e]">
          {t({ en: 'Accept', fr: 'Accepter', ar: 'موافق' })}
        </button>
        <button onClick={() => set('denied')} className="label border border-ivory/25 px-5 py-3 text-ivory/80 hover:border-ivory/60">
          {t({ en: 'Refuse', fr: 'Refuser', ar: 'رفض' })}
        </button>
      </div>
    </div>
  )
}
