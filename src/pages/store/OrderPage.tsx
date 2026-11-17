import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { api, formatMAD, submitCmiForm } from '../../lib/api'
import { useAsync } from '../../lib/useAsync'
import { useTransitionNavigate } from '../../components/Curtain'
import { Khatam } from '../../components/Ornaments'
import { PayPalButtons } from '../../components/PayPalButtons'
import { StoreState } from './StoreShared'
import { useLang, useT, type T } from '../../lib/i18n'
import { track } from '../../lib/analytics'
import type { OrderSummary, PaymentConfig } from '../../../shared/schemas'

const STATUS: Record<OrderSummary['status'], T> = {
  pending: { en: 'Received', fr: 'Reçue', ar: 'تم الاستلام' },
  confirmed: { en: 'Confirmed', fr: 'Confirmée', ar: 'مؤكَّد' },
  shipped: { en: 'Shipped', fr: 'Expédiée', ar: 'تم الشحن' },
  delivered: { en: 'Delivered', fr: 'Livrée', ar: 'تم التسليم' },
  cancelled: { en: 'Cancelled', fr: 'Annulée', ar: 'ملغى' },
}

function PayNow({ order, onPaid }: { order: OrderSummary; onPaid: () => void }) {
  const t = useT()
  const lang = useLang((s) => s.lang)
  const [params] = useSearchParams()
  const [cfg, setCfg] = useState<PaymentConfig | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  useEffect(() => {
    api.paymentConfig().then(setCfg, () => setCfg({ card: false, paypal: null }))
  }, [])

  const failed = order.paymentStatus === 'failed' || params.get('payment') === 'failed'
  const payCard = async () => {
    setBusy(true)
    setErr('')
    try {
      submitCmiForm(await api.cmiStart(order.reference, lang))
    } catch (e) {
      setBusy(false)
      setErr(e instanceof Error ? e.message : 'Error')
    }
  }

  return (
    <div className="mt-10 border border-gold/40 bg-gold/5 p-6">
      <p className="label text-gold">{t({ en: 'Payment', fr: 'Paiement', ar: 'الدفع' })}</p>
      <p className="mt-3 text-[15px] leading-relaxed text-ivory/80">
        {failed
          ? t({ en: 'The payment did not go through. Your order is still reserved for a while: you can try again.', fr: 'Le paiement n’a pas abouti. Votre commande reste réservée quelque temps : vous pouvez réessayer.', ar: 'لم تتمّ عملية الدفع. يبقى طلبك محجوزًا لبعض الوقت: يمكنك المحاولة مجددًا.' })
          : t({ en: 'Your pieces are reserved. Complete the payment to confirm the order.', fr: 'Vos pièces sont réservées. Réglez la commande pour la confirmer.', ar: 'قطعك محجوزة. أكمل الدفع لتأكيد الطلب.' })}
      </p>
      <div className="mt-6">
        {order.paymentMethod === 'card' && (
          <button onClick={payCard} disabled={busy || !cfg?.card} className="label w-full bg-gold py-5 text-olive transition-colors hover:bg-[#c39a5e] disabled:opacity-50 sm:w-auto sm:px-10">
            {busy ? t({ en: 'Opening the secure page…', fr: 'Ouverture de la page sécurisée…', ar: 'جارٍ فتح الصفحة الآمنة…' }) : t({ en: `Pay ${formatMAD(order.total)} by card`, fr: `Payer ${formatMAD(order.total)} par carte`, ar: `ادفع ${formatMAD(order.total)} بالبطاقة` })}
          </button>
        )}
        {order.paymentMethod === 'paypal' && cfg?.paypal && <PayPalButtons reference={order.reference} clientId={cfg.paypal.clientId} currency={cfg.paypal.currency} onPaid={onPaid} />}
        {cfg && ((order.paymentMethod === 'card' && !cfg.card) || (order.paymentMethod === 'paypal' && !cfg.paypal)) && (
          <p className="text-[13px] text-ivory/55">{t({ en: 'Online payment is unavailable right now. We will call you to arrange payment.', fr: 'Le paiement en ligne est indisponible pour le moment. Nous vous appellerons pour convenir du règlement.', ar: 'الدفع عبر الإنترنت غير متاح حاليًا. سنتصل بك للاتفاق على طريقة الدفع.' })}</p>
        )}
        {err && <p role="alert" className="mt-3 text-[13px] text-[#f0c3b0]">{err}</p>}
      </div>
    </div>
  )
}

export default function OrderPage() {
  const t = useT()
  const { reference = '' } = useParams()
  const [params] = useSearchParams()
  const go = useTransitionNavigate()
  const { data, loading, error, retry } = useAsync(() => api.order(reference), [reference])

  // back from the card page: count it once
  useEffect(() => {
    if (data?.paymentStatus === 'paid' && params.get('payment') === 'ok') track('payment_completed', { method: data.paymentMethod, value: data.total })
  }, [data, params])

  const onPaypalPaid = () => {
    if (data) track('payment_completed', { method: 'paypal', value: data.total })
    retry()
  }

  const online = data && data.paymentMethod !== 'cod'
  const paid = data?.paymentStatus === 'paid'
  const waiting = online && !paid && data?.status === 'pending'

  return (
    <div className="min-h-screen bg-olive px-4 pb-24 pt-28 sm:px-8 sm:pt-32">
      <StoreState loading={loading} error={error} retry={retry}>
        {data && (
          <div className="mx-auto max-w-3xl">
            <Khatam className="h-14 w-14 text-gold" />
            <p className="label mt-8 text-gold">
              {t({ en: 'Order', fr: 'Commande', ar: 'الطلب' })} {data.reference} · {t(STATUS[data.status] ?? STATUS.pending)}
              {paid && <> · {t({ en: 'Paid', fr: 'Payée', ar: 'مدفوع' })}</>}
            </p>
            <h1 className="display mt-4 text-5xl leading-[0.95] text-ivory sm:text-7xl">
              {t({ en: 'Shukran', fr: 'Choukran', ar: 'شكرًا' })}, {data.firstName}.
              <br />
              <span className="italic text-beige">
                {data.status === 'cancelled'
                  ? t({ en: 'This order was cancelled.', fr: 'Cette commande a été annulée.', ar: 'تم إلغاء هذا الطلب.' })
                  : waiting
                    ? t({ en: 'One step left.', fr: 'Plus qu’une étape.', ar: 'بقيت خطوة واحدة.' })
                    : t({ en: 'Your order is in.', fr: 'Votre commande est enregistrée.', ar: 'تم تسجيل طلبك.' })}
              </span>
            </h1>
            <p className="mt-6 max-w-lg text-[15px] leading-relaxed text-ivory/70">
              {data.status === 'cancelled'
                ? online && !paid
                  ? t({ en: 'It was not paid in time, so the pieces went back to the collection. You are welcome to order again.', fr: 'Elle n’a pas été réglée à temps, les pièces sont donc retournées dans la collection. Vous pouvez commander à nouveau.', ar: 'لم يتمّ الدفع في الوقت المحدد، فعادت القطع إلى المجموعة. يمكنك الطلب من جديد.' })
                  : t({ en: 'Contact us if you have a question about it.', fr: 'Contactez-nous si vous avez une question à ce sujet.', ar: 'تواصل معنا إن كان لديك أي سؤال بشأنه.' })
                : paid
                  ? t({ en: `Payment received. We will call you to confirm delivery to ${data.city}. Keep your reference:`, fr: `Paiement reçu. Nous vous appellerons pour confirmer la livraison à ${data.city}. Gardez votre référence :`, ar: `تم استلام الدفع. سنتصل بك لتأكيد التوصيل إلى ${data.city}. احتفظ بمرجعك:` })
                  : online
                    ? t({ en: 'Keep your reference:', fr: 'Gardez votre référence :', ar: 'احتفظ بمرجعك:' })
                    : t({
                        en: `We will call you to confirm delivery to ${data.city}. You pay ${formatMAD(data.total)} in cash when it arrives. Keep your reference:`,
                        fr: `Nous vous appellerons pour confirmer la livraison à ${data.city}. Vous payez ${formatMAD(data.total)} en espèces à la réception. Gardez votre référence :`,
                        ar: `سنتصل بك لتأكيد التوصيل إلى ${data.city}. ستدفع ${formatMAD(data.total)} نقدًا عند الاستلام. احتفظ بمرجعك:`,
                      })}{' '}
              {data.status !== 'cancelled' && <strong className="font-medium text-ivory">{data.reference}</strong>}
              {data.status !== 'cancelled' && '.'}
            </p>

            {waiting && <PayNow order={data} onPaid={onPaypalPaid} />}

            <ul className="mt-12 divide-y divide-ivory/10 border-y border-ivory/10">
              {data.items.map((i, k) => (
                <li key={k} className="flex justify-between gap-4 py-4 text-[14px]">
                  <span className="text-ivory/85">
                    {i.name}
                    {i.variant && <span className="block text-[12px] text-ivory/45">{i.variant}</span>}
                    <span className="block text-[12px] text-ivory/45">
                      {i.quantity} × {formatMAD(i.unitPrice)}
                    </span>
                  </span>
                  <span className="text-ivory">{formatMAD(i.lineTotal)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-6 space-y-2 text-sm">
              <div className="flex justify-between text-ivory/60">
                <dt>{t({ en: 'Subtotal', fr: 'Sous-total', ar: 'المجموع الفرعي' })}</dt>
                <dd>{formatMAD(data.subtotal)}</dd>
              </div>
              <div className="flex justify-between text-ivory/60">
                <dt>{t({ en: 'Delivery', fr: 'Livraison', ar: 'التوصيل' })}</dt>
                <dd>{data.shipping ? formatMAD(data.shipping) : t({ en: 'Confirmed by phone', fr: 'Confirmée par téléphone', ar: 'يُؤكَّد بالهاتف' })}</dd>
              </div>
              <div className="flex items-baseline justify-between pt-2">
                <dt className="label text-ivory/70">
                  {data.paymentMethod === 'cod'
                    ? t({ en: 'Total · cash on delivery', fr: 'Total · paiement à la livraison', ar: 'المجموع · الدفع عند الاستلام' })
                    : data.paymentMethod === 'card'
                      ? t({ en: 'Total · bank card', fr: 'Total · carte bancaire', ar: 'المجموع · البطاقة البنكية' })
                      : t({ en: 'Total · PayPal', fr: 'Total · PayPal', ar: 'المجموع · PayPal' })}
                </dt>
                <dd className="display text-4xl text-ivory">{formatMAD(data.total)}</dd>
              </div>
            </dl>
            <div className="mt-12 flex flex-wrap gap-4">
              <button onClick={() => go('/store')} className="label border border-gold/60 px-6 py-3 text-ivory hover:bg-gold/10">
                {t({ en: 'Back to the collection', fr: 'Retour à la collection', ar: 'العودة إلى المجموعة' })}
              </button>
              <button onClick={() => go('/#guembri')} className="label px-6 py-3 text-ivory/60 hover:text-ivory">
                {t({ en: 'Play the guembri', fr: 'Jouer du guembri', ar: 'اعزف على الكَمبري' })} <span className="inline-block rtl:-scale-x-100">→</span>
              </button>
            </div>
          </div>
        )}
      </StoreState>
    </div>
  )
}
