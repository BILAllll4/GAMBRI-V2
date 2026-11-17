/**
 * PayPal's own buttons for an order that is waiting for payment. The PayPal
 * order is created and captured by our API (amount computed server-side); the
 * browser only opens PayPal's window.
 */
import { useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'
import { useT } from '../lib/i18n'

type PaypalNS = {
  Buttons: (o: {
    style?: Record<string, string | number>
    createOrder: () => Promise<string>
    onApprove: () => Promise<void>
    onError?: (e: unknown) => void
    onCancel?: () => void
  }) => { render: (el: HTMLElement) => Promise<void>; close?: () => void }
}

let sdk: Promise<PaypalNS> | null = null
function loadSdk(clientId: string, currency: string) {
  if (!sdk) {
    sdk = new Promise((resolve, reject) => {
      const s = document.createElement('script')
      s.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=${encodeURIComponent(currency)}&intent=capture&components=buttons`
      s.async = true
      s.onload = () => resolve((window as unknown as { paypal: PaypalNS }).paypal)
      s.onerror = () => {
        sdk = null
        reject(new Error('PayPal could not be loaded'))
      }
      document.head.appendChild(s)
    })
  }
  return sdk
}

export function PayPalButtons({ reference, clientId, currency, onPaid }: { reference: string; clientId: string; currency: string; onPaid: () => void }) {
  const t = useT()
  const box = useRef<HTMLDivElement>(null)
  const [error, setError] = useState('')
  const paid = useRef(onPaid)
  paid.current = onPaid

  useEffect(() => {
    let alive = true
    let buttons: { close?: () => void } | null = null
    loadSdk(clientId, currency)
      .then((paypal) => {
        if (!alive || !box.current) return
        const b = paypal.Buttons({
          style: { layout: 'vertical', color: 'gold', shape: 'rect', label: 'pay', height: 48 },
          createOrder: () => api.paypalCreate(reference).then((r) => r.id),
          onApprove: () =>
            api.paypalCapture(reference).then(
              () => paid.current(),
              (e: Error) => setError(e.message),
            ),
          onError: () => setError('PayPal'),
        })
        buttons = b
        return b.render(box.current)
      })
      .catch((e: Error) => alive && setError(e.message))
    return () => {
      alive = false
      buttons?.close?.()
    }
  }, [reference, clientId, currency])

  return (
    <div>
      <div ref={box} className="min-h-12 rounded-sm bg-ivory p-3" />
      {error && (
        <p role="alert" className="mt-3 text-[13px] text-[#f0c3b0]">
          {t({ en: 'The payment did not go through. You can try again.', fr: 'Le paiement n’a pas abouti. Vous pouvez réessayer.', ar: 'لم تتمّ عملية الدفع. يمكنك المحاولة مجددًا.' })}
        </p>
      )}
    </div>
  )
}
