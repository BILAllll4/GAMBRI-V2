/**
 * Customer reviews under a product: the average, the approved reviews, and a
 * form. New reviews wait for approval at /admin/reviews before they appear.
 */
import { useState, type FormEvent } from 'react'
import { api, ApiError } from '../../lib/api'
import { useAsync } from '../../lib/useAsync'
import { useLang, useT } from '../../lib/i18n'
import { track } from '../../lib/analytics'
import { reviewInputSchema } from '../../../shared/schemas'

export function Stars({ value, className = '' }: { value: number; className?: string }) {
  return (
    <span className={`inline-flex gap-0.5 ${className}`} aria-hidden>
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = Math.max(0, Math.min(1, value - (i - 1)))
        return (
          <svg key={i} viewBox="0 0 20 20" className="h-[1em] w-[1em]">
            <defs>
              <linearGradient id={`s${i}-${Math.round(fill * 100)}`}>
                <stop offset={`${fill * 100}%`} stopColor="currentColor" />
                <stop offset={`${fill * 100}%`} stopColor="currentColor" stopOpacity="0.2" />
              </linearGradient>
            </defs>
            <path fill={`url(#s${i}-${Math.round(fill * 100)})`} d="M10 1.5l2.6 5.5 6 .8-4.4 4.1 1.1 6-5.3-2.9-5.3 2.9 1.1-6L1.4 7.8l6-.8z" />
          </svg>
        )
      })}
    </span>
  )
}

function ReviewForm({ slug, onDone }: { slug: string; onDone: () => void }) {
  const t = useT()
  const [f, setF] = useState({ name: '', rating: 0, body: '', orderRef: '', website: '' })
  const [errors, setErrors] = useState<Record<string, string | undefined>>({})
  const [state, setState] = useState<'idle' | 'sending' | 'error'>('idle')
  const [serverError, setServerError] = useState('')
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => {
    setF((x) => ({ ...x, [k]: e.target.value }))
    setErrors((x) => ({ ...x, [k]: undefined }))
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setServerError('')
    const parsed = reviewInputSchema.safeParse(f)
    if (!parsed.success) {
      const next: Record<string, string> = {}
      for (const i of parsed.error.issues) next[String(i.path[0])] ??= i.message
      setErrors(next)
      return
    }
    setState('sending')
    try {
      await api.createReview(slug, f)
      track('review_submitted', { product: slug, rating: f.rating })
      onDone()
    } catch (err) {
      setState('error')
      if (err instanceof ApiError && err.issues) {
        const next: Record<string, string> = {}
        for (const i of err.issues) next[String(i.path[0])] ??= i.message
        setErrors(next)
      }
      setServerError(err instanceof Error ? err.message : 'Error')
    }
  }

  return (
    <form onSubmit={submit} noValidate className="mt-8 space-y-6 border border-ivory/10 p-6">
      <fieldset>
        <legend className="label text-ivory/55">{t({ en: 'Your rating', fr: 'Votre note', ar: 'تقييمك' })}</legend>
        <div className="mt-2 flex gap-1" role="radiogroup">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={f.rating === n}
              aria-label={`${n} / 5`}
              onClick={() => {
                setF((x) => ({ ...x, rating: n }))
                setErrors((x) => ({ ...x, rating: undefined }))
              }}
              className={`text-2xl transition-colors ${n <= f.rating ? 'text-gold' : 'text-ivory/25 hover:text-ivory/50'}`}
            >
              ★
            </button>
          ))}
        </div>
        {errors.rating && <span className="mt-1 block text-[12px] text-[#e0a58d]">{errors.rating}</span>}
      </fieldset>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <label className="block">
          <span className="label text-ivory/55">{t({ en: 'Name', fr: 'Nom', ar: 'الاسم' })}</span>
          <input className="field" autoComplete="given-name" value={f.name} onChange={set('name')} aria-invalid={errors.name ? true : undefined} />
          {errors.name && <span className="mt-1 block text-[12px] text-[#e0a58d]">{errors.name}</span>}
        </label>
        <label className="block">
          <span className="label text-ivory/55">{t({ en: 'Order reference (optional)', fr: 'Référence de commande (facultatif)', ar: 'مرجع الطلب (اختياري)' })}</span>
          <input className="field uppercase" placeholder="GN-3MW6WQ" value={f.orderRef} onChange={set('orderRef')} aria-invalid={errors.orderRef ? true : undefined} />
          {errors.orderRef ? (
            <span className="mt-1 block text-[12px] text-[#e0a58d]">{errors.orderRef}</span>
          ) : (
            <span className="mt-1 block text-[11px] text-ivory/35">{t({ en: 'Marks your review as a verified purchase', fr: 'Signale votre avis comme achat vérifié', ar: 'يُظهر تقييمك كشراء مؤكَّد' })}</span>
          )}
        </label>
      </div>
      <label className="block">
        <span className="label text-ivory/55">{t({ en: 'Your review', fr: 'Votre avis', ar: 'رأيك' })}</span>
        <textarea className="field min-h-28 resize-y" value={f.body} onChange={set('body')} maxLength={1000} aria-invalid={errors.body ? true : undefined} />
        {errors.body && <span className="mt-1 block text-[12px] text-[#e0a58d]">{errors.body}</span>}
      </label>
      {/* honeypot: invisible to people */}
      <input tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] h-0 w-0 opacity-0" name="website" value={f.website} onChange={set('website')} />
      {serverError && <p role="alert" className="text-[13px] text-[#f0c3b0]">{serverError}</p>}
      <button type="submit" disabled={state === 'sending'} className="label bg-gold px-8 py-4 text-olive transition-colors hover:bg-[#c39a5e] disabled:opacity-60">
        {state === 'sending' ? t({ en: 'Sending…', fr: 'Envoi…', ar: 'جارٍ الإرسال…' }) : t({ en: 'Publish my review', fr: 'Publier mon avis', ar: 'انشر تقييمي' })}
      </button>
    </form>
  )
}

export function Reviews({ slug }: { slug: string }) {
  const t = useT()
  const lang = useLang((s) => s.lang)
  const { data, error } = useAsync(() => api.reviews(slug), [slug])
  const [open, setOpen] = useState(false)
  const [sent, setSent] = useState(false)
  const dateFmt = new Intl.DateTimeFormat(lang === 'ar' ? 'ar-MA' : lang === 'fr' ? 'fr-MA' : 'en-GB', { year: 'numeric', month: 'long' })

  if (error) return null // the product page already says when the store is offline

  return (
    <section className="mt-24 border-t border-ivory/10 pt-14" aria-labelledby="reviews-title">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="label text-gold">{t({ en: 'Reviews', fr: 'Avis', ar: 'التقييمات' })}</p>
          <h2 id="reviews-title" className="display mt-3 text-4xl text-ivory sm:text-5xl">
            {t({ en: 'What players say', fr: 'Ce qu’en disent les musiciens', ar: 'ماذا يقول العازفون' })}
          </h2>
          {data && data.count > 0 && (
            <p className="mt-4 flex items-center gap-3 text-ivory/80">
              <Stars value={data.average} className="text-xl text-gold" />
              <span className="text-[15px]">
                {data.average.toFixed(1)} / 5 · {data.count} {data.count === 1 ? t({ en: 'review', fr: 'avis', ar: 'تقييم' }) : t({ en: 'reviews', fr: 'avis', ar: 'تقييمات' })}
              </span>
            </p>
          )}
        </div>
        {!open && !sent && (
          <button onClick={() => setOpen(true)} className="label border border-gold/60 px-6 py-3 text-ivory hover:bg-gold/10">
            {t({ en: 'Write a review', fr: 'Écrire un avis', ar: 'اكتب تقييمًا' })}
          </button>
        )}
      </div>

      {sent && (
        <p role="status" className="mt-8 border border-sage/40 bg-sage/10 px-5 py-4 text-[14px] text-ivory/85">
          {t({ en: 'Thank you. Your review will appear here once it has been checked.', fr: 'Merci. Votre avis apparaîtra ici après vérification.', ar: 'شكرًا لك. سيظهر تقييمك هنا بعد مراجعته.' })}
        </p>
      )}
      {open && !sent && (
        <ReviewForm
          slug={slug}
          onDone={() => {
            setSent(true)
            setOpen(false)
          }}
        />
      )}

      {data && data.count === 0 && !open && !sent && (
        <p className="mt-8 text-[14px] text-ivory/50">{t({ en: 'No reviews yet. Be the first to tell others about this piece.', fr: 'Pas encore d’avis. Soyez le premier à parler de cette pièce.', ar: 'لا توجد تقييمات بعد. كن أول من يتحدث عن هذه القطعة.' })}</p>
      )}

      {data && data.reviews.length > 0 && (
        <ul className="mt-10 grid grid-cols-1 gap-x-12 gap-y-10 md:grid-cols-2">
          {data.reviews.map((r) => (
            <li key={r.id} className="border-t border-ivory/10 pt-6">
              <div className="flex items-center justify-between gap-4">
                <Stars value={r.rating} className="text-gold" />
                <span className="text-[12px] text-ivory/40">{dateFmt.format(new Date(r.createdAt.replace(' ', 'T')))}</span>
              </div>
              <p className="mt-4 whitespace-pre-line text-[15px] leading-relaxed text-ivory/80">{r.body}</p>
              <p className="mt-4 text-[13px] text-ivory/55">
                {r.name}
                {r.verified && <span className="label ms-3 text-[9px] text-sage">✓ {t({ en: 'Verified purchase', fr: 'Achat vérifié', ar: 'شراء مؤكَّد' })}</span>}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
