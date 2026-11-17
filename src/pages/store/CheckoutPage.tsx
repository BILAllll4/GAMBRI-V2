import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { useCart, cartSubtotal } from '../../store/cart'
import { api, ApiError, formatMAD, submitCmiForm } from '../../lib/api'
import { orderInputSchema, MOROCCAN_CITIES, type OrderInput, type PaymentConfig, type PaymentMethod } from '../../../shared/schemas'
import { useTransitionNavigate } from '../../components/Curtain'
import { DemoNotice } from './StoreShared'
import { useLang, useT, type T } from '../../lib/i18n'
import { track } from '../../lib/analytics'

const METHOD: Record<PaymentMethod, { title: T; lead: T }> = {
  cod: {
    title: { en: 'Cash on delivery', fr: 'Paiement à la livraison', ar: 'الدفع عند الاستلام' },
    lead: { en: 'Pay the courier in dirhams when your order arrives.', fr: 'Payez le livreur en dirhams à l’arrivée de votre commande.', ar: 'ادفع لعامل التوصيل بالدرهم عند وصول طلبك.' },
  },
  card: {
    title: { en: 'Bank card (CMI)', fr: 'Carte bancaire (CMI)', ar: 'البطاقة البنكية (CMI)' },
    lead: { en: 'Moroccan and international Visa / Mastercard, on the secure CMI page, in dirhams.', fr: 'Visa / Mastercard marocaines et internationales, sur la page sécurisée du CMI, en dirhams.', ar: 'فيزا / ماستركارد مغربية ودولية، عبر صفحة CMI الآمنة، بالدرهم.' },
  },
  paypal: {
    title: { en: 'PayPal', fr: 'PayPal', ar: 'PayPal' },
    lead: { en: 'Pay with your PayPal account or a card through PayPal.', fr: 'Payez avec votre compte PayPal ou une carte via PayPal.', ar: 'ادفع بحساب PayPal أو ببطاقة عبر PayPal.' },
  },
}

type Errors = Partial<Record<string, string>>

function Field({ label, error, children, hint }: { label: string; error?: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="label text-ivory/55">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-[12px] text-[#e0a58d]">{error}</span> : hint ? <span className="mt-1 block text-[11px] text-ivory/35">{hint}</span> : null}
    </label>
  )
}

export default function CheckoutPage() {
  const t = useT()
  const lang = useLang((s) => s.lang)
  const { lines, clear } = useCart()
  const go = useTransitionNavigate()
  const subtotal = cartSubtotal(lines)
  const [form, setForm] = useState({ fullName: '', phone: '', email: '', city: '', address: '', postalCode: '', notes: '' })
  const [errors, setErrors] = useState<Errors>({})
  const [status, setStatus] = useState<'idle' | 'sending' | 'error'>('idle')
  const [serverError, setServerError] = useState('')
  const [pay, setPay] = useState<PaymentConfig>({ card: false, paypal: null })
  const [method, setMethod] = useState<PaymentMethod>('cod')

  useEffect(() => {
    api.paymentConfig().then(setPay, () => {})
  }, [])
  useEffect(() => {
    if (lines.length) track('begin_checkout', { items: lines.length, value: subtotal })
    // once per visit to the page
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const available: Record<PaymentMethod, boolean> = { cod: true, card: pay.card, paypal: !!pay.paypal }

  const input: OrderInput = useMemo(
    () => ({
      customer: { fullName: form.fullName, phone: form.phone, email: form.email },
      delivery: { city: form.city, address: form.address, postalCode: form.postalCode, notes: form.notes },
      payment: method,
      items: lines.map((l) => ({ productId: l.productId, variantId: l.variantId, quantity: l.quantity })),
    }),
    [form, lines, method],
  )

  const fieldOf = (path: (string | number)[]) => String(path[path.length - 1])
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => {
    setForm((f) => ({ ...f, [k]: e.target.value }))
    if (errors[k]) setErrors((x) => ({ ...x, [k]: undefined }))
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setServerError('')
    const parsed = orderInputSchema.safeParse(input)
    if (!parsed.success) {
      const next: Errors = {}
      for (const i of parsed.error.issues) next[fieldOf(i.path as (string | number)[])] ??= i.message
      setErrors(next)
      document.querySelector<HTMLElement>('[aria-invalid=true]')?.focus()
      return
    }
    setStatus('sending')
    try {
      const { reference, total } = await api.createOrder(input)
      track('order_placed', { method, value: total, items: lines.length })
      clear()
      if (method === 'card') {
        // the order exists and holds its stock; if the gateway cannot be reached, the order page offers to pay again
        try {
          submitCmiForm(await api.cmiStart(reference, lang))
          return
        } catch {
          go(`/order/${reference}?payment=failed`, { label: 'Order received' })
          return
        }
      }
      go(`/order/${reference}${method === 'paypal' ? '?pay=1' : ''}`, { label: 'Order received' })
    } catch (err) {
      setStatus('error')
      if (err instanceof ApiError && err.issues) {
        const next: Errors = {}
        for (const i of err.issues) next[fieldOf(i.path)] ??= i.message
        setErrors(next)
      }
      setServerError(err instanceof Error ? err.message : 'Could not place the order')
    }
  }

  if (lines.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-start justify-center gap-6 bg-olive px-4 sm:px-8">
        <h1 className="display text-6xl text-ivory">{t({ en: "Checkout", fr: "Commande", ar: "إتمام الطلب" })}</h1>
        <p className="text-ivory/60">{t({ en: "Your cart is empty.", fr: "Votre panier est vide.", ar: "سلتك فارغة." })}</p>
        <button onClick={() => go('/store', { tone: 'gold', label: 'The collection' })} className="label border border-gold/60 px-6 py-3 text-ivory hover:bg-gold/10">
          {t({ en: "Enter the store", fr: "Entrer dans la boutique", ar: "ادخل المتجر" })} <span className="inline-block rtl:-scale-x-100">→</span>
        </button>
      </div>
    )
  }

  const inv = (k: string) => (errors[k] ? true : undefined)

  return (
    <div className="min-h-screen bg-olive px-4 pb-24 pt-28 sm:px-8 sm:pt-32">
      <p className="label text-gold">
        {available.card || available.paypal
          ? t({ en: "Cash on delivery or online · Morocco", fr: "À la livraison ou en ligne · Maroc", ar: "الدفع عند الاستلام أو عبر الإنترنت · المغرب" })
          : t({ en: "Cash on delivery · Morocco", fr: "Paiement à la livraison · Maroc", ar: "الدفع عند الاستلام · المغرب" })}
      </p>
      <h1 className="display mt-4 text-6xl text-ivory sm:text-8xl">{t({ en: "Checkout", fr: "Commande", ar: "إتمام الطلب" })}</h1>

      <form onSubmit={submit} noValidate className="mt-14 grid grid-cols-1 gap-14 lg:grid-cols-12">
        <div className="space-y-14 lg:col-span-7">
          <section>
            <h2 className="display text-3xl text-ivory">
              <span className="me-3 text-gold">01</span>{t({ en: "Your details", fr: "Vos coordonnées", ar: "معلوماتك" })}
            </h2>
            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
              <Field label={t({ en: "Full name", fr: "Nom complet", ar: "الاسم الكامل" })} error={errors.fullName}>
                <input className="field" autoComplete="name" value={form.fullName} onChange={set('fullName')} aria-invalid={inv('fullName')} />
              </Field>
              <Field label={t({ en: "Phone", fr: "Téléphone", ar: "الهاتف" })} error={errors.phone} hint={t({ en: "We call to confirm before dispatch", fr: "Nous appelons pour confirmer avant l’envoi", ar: "نتصل للتأكيد قبل الإرسال" })}>
                <input className="field" type="tel" inputMode="tel" autoComplete="tel" placeholder="06 12 34 56 78" value={form.phone} onChange={set('phone')} aria-invalid={inv('phone')} />
              </Field>
              <Field
                label={method === 'cod' ? t({ en: "Email (optional)", fr: "E-mail (facultatif)", ar: "البريد الإلكتروني (اختياري)" }) : t({ en: "Email (for the receipt)", fr: "E-mail (pour le reçu)", ar: "البريد الإلكتروني (لإرسال الإيصال)" })}
                error={errors.email}
              >
                <input className="field" type="email" autoComplete="email" value={form.email} onChange={set('email')} aria-invalid={inv('email')} />
              </Field>
            </div>
          </section>

          <section>
            <h2 className="display text-3xl text-ivory">
              <span className="me-3 text-gold">02</span>{t({ en: "Delivery address", fr: "Adresse de livraison", ar: "عنوان التوصيل" })}
            </h2>
            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
              <Field label={t({ en: "City", fr: "Ville", ar: "المدينة" })} error={errors.city}>
                <select className="field" value={form.city} onChange={set('city')} aria-invalid={inv('city')} autoComplete="address-level2">
                  <option value="">{t({ en: "Choose…", fr: "Choisir…", ar: "اختر…" })}</option>
                  {MOROCCAN_CITIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
              <Field label={t({ en: "Postal code (optional)", fr: "Code postal (facultatif)", ar: "الرمز البريدي (اختياري)" })} error={errors.postalCode}>
                <input className="field" inputMode="numeric" autoComplete="postal-code" value={form.postalCode} onChange={set('postalCode')} aria-invalid={inv('postalCode')} />
              </Field>
              <div className="sm:col-span-2">
                <Field label={t({ en: "Street, number, district", fr: "Rue, numéro, quartier", ar: "الشارع، الرقم، الحي" })} error={errors.address}>
                  <input className="field" autoComplete="street-address" value={form.address} onChange={set('address')} aria-invalid={inv('address')} />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label={t({ en: "Delivery notes (optional)", fr: "Instructions de livraison (facultatif)", ar: "ملاحظات التوصيل (اختياري)" })} error={errors.notes}>
                  <textarea className="field min-h-20 resize-y" value={form.notes} onChange={set('notes')} />
                </Field>
              </div>
            </div>
          </section>

          <section>
            <h2 className="display text-3xl text-ivory">
              <span className="me-3 text-gold">03</span>{t({ en: "Payment", fr: "Paiement", ar: "الدفع" })}
            </h2>
            <div className="mt-6 space-y-3" role="radiogroup" aria-label={t({ en: "Payment method", fr: "Moyen de paiement", ar: "طريقة الدفع" })}>
              {(['cod', 'card', 'paypal'] as const).map((m) => {
                const on = available[m]
                const chosen = method === m
                return (
                  <label
                    key={m}
                    aria-disabled={!on || undefined}
                    className={`flex items-start gap-4 border p-5 transition-colors ${!on ? 'border-ivory/10 opacity-50' : chosen ? 'cursor-pointer border-gold/60 bg-gold/5' : 'cursor-pointer border-ivory/15 hover:border-ivory/40'}`}
                  >
                    <input type="radio" name="pay" value={m} checked={chosen} disabled={!on} onChange={() => setMethod(m)} className="mt-1 accent-[#b18a52]" />
                    <span>
                      <span className="block text-ivory">{t(METHOD[m].title)}</span>
                      <span className="mt-1 block text-[13px] text-ivory/55">
                        {on
                          ? t(METHOD[m].lead)
                          : t({ en: "Not available yet.", fr: "Pas encore disponible.", ar: "غير متاح بعد." })}
                      </span>
                      {m === 'paypal' && on && pay.paypal && (
                        <span className="mt-1 block text-[12px] text-ivory/40">
                          {t({ en: `Charged in ${pay.paypal.currency}: about`, fr: `Débité en ${pay.paypal.currency} : environ`, ar: `يُقتطع بعملة ${pay.paypal.currency}: حوالي` })}{' '}
                          {(subtotal / pay.paypal.madPerUnit).toFixed(2)} {pay.paypal.currency}
                        </span>
                      )}
                    </span>
                  </label>
                )
              })}
            </div>
          </section>
        </div>

        {/* summary */}
        <aside className="lg:col-span-5">
          <div className="border border-ivory/10 p-6 lg:sticky lg:top-24">
            <p className="label text-ivory/60">{t({ en: "Order summary", fr: "Récapitulatif", ar: "ملخّص الطلب" })}</p>
            <ul className="mt-4 divide-y divide-ivory/10">
              {lines.map((l) => (
                <li key={l.key} className="flex justify-between gap-4 py-3 text-[14px]">
                  <span className="text-ivory/85">
                    {l.name}
                    {l.variantName && <span className="block text-[12px] text-ivory/45">{l.variantName}</span>}
                    <span className="block text-[12px] text-ivory/45">× {l.quantity}</span>
                  </span>
                  <span className="shrink-0 text-ivory">{formatMAD(l.unitPrice * l.quantity)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex justify-between border-t border-ivory/10 pt-4 text-sm text-ivory/70">
              <span>{t({ en: "Delivery", fr: "Livraison", ar: "التوصيل" })}</span>
              <span>{t({ en: "Confirmed by phone", fr: "Confirmée par téléphone", ar: "يُؤكَّد بالهاتف" })}</span>
            </div>
            <div className="mt-4 flex items-baseline justify-between">
              <span className="label text-ivory/70">{t({ en: "Total", fr: "Total", ar: "المجموع" })}</span>
              <span className="display text-4xl text-ivory">{formatMAD(subtotal)}</span>
            </div>
            <p className="mt-2 text-[11px] text-ivory/40">{t({ en: "Prices and stock are checked again by the server when you place the order.", fr: "Les prix et le stock sont revérifiés par le serveur lors de la commande.", ar: "يعيد الخادم التحقق من الأسعار والمخزون عند تقديم الطلب." })}</p>

            {serverError && (
              <p role="alert" className="mt-5 border border-[#e0a58d]/40 bg-[#e0a58d]/10 px-4 py-3 text-[13px] text-[#f0c3b0]">
                {serverError}
              </p>
            )}
            <button type="submit" disabled={status === 'sending'} className="label mt-6 w-full bg-gold py-5 text-olive transition-colors hover:bg-[#c39a5e] disabled:opacity-60">
              {status === 'sending'
                ? t({ en: "Placing order…", fr: "Envoi de la commande…", ar: "جارٍ إرسال الطلب…" })
                : method === 'cod'
                  ? t({ en: "Place order · cash on delivery", fr: "Commander · paiement à la livraison", ar: "أرسل الطلب · الدفع عند الاستلام" })
                  : method === 'card'
                    ? t({ en: "Order and pay by card", fr: "Commander et payer par carte", ar: "اطلب وادفع بالبطاقة" })
                    : t({ en: "Order and pay with PayPal", fr: "Commander et payer avec PayPal", ar: "اطلب وادفع عبر PayPal" })}
            </button>
            <DemoNotice className="mt-6" />
          </div>
        </aside>
      </form>
    </div>
  )
}
