/**
 * Online payment, on top of the orders created by POST /api/orders.
 *
 *  - Card: CMI "3D Pay Hosting". The browser posts a signed form to CMI's page;
 *    CMI calls our callback server-to-server (the source of truth) and sends the
 *    visitor back to okUrl / failUrl. Every message from CMI is checked against
 *    its HASH (SHA-512 over the sorted parameters + the store key).
 *  - PayPal: Orders v2. The total is converted from MAD at PAYPAL_MAD_RATE,
 *    created and captured by the server; the browser only shows PayPal's buttons.
 *
 * Both are switched on by .env (see .env.example). Unpaid online orders give
 * their stock back after UNPAID_HOLD_MINUTES.
 */
import express, { Router } from 'express'
import crypto from 'node:crypto'
import type { RowDataPacket } from 'mysql2'
import { pool } from '../db'
import { config, cmiEnabled, paypalEnabled } from '../config'
import { rateLimit } from '../rateLimit'
import { restock } from './orders'
import type { PaymentConfig } from '../../shared/schemas'

export const payments = Router()

interface OrderRow extends RowDataPacket {
  id: number
  reference: string
  status: string
  payment_method: string
  payment_status: string
  payment_ref: string | null
  total_mad: number
  full_name: string
  phone: string
  email: string | null
}

async function findOrder(reference: string) {
  const [rows] = await pool.query<OrderRow[]>(
    'SELECT o.*, c.full_name, c.phone, c.email FROM orders o JOIN customers c ON c.id = o.customer_id WHERE o.reference = ?',
    [reference],
  )
  return rows[0] ?? null
}

const payable = (o: OrderRow | null, method: string) =>
  !!o && o.payment_method === method && o.status === 'pending' && (o.payment_status === 'awaiting' || o.payment_status === 'failed')

async function markPaid(reference: string, method: string, ref: string) {
  const [r] = await pool.query<RowDataPacket[]>('SELECT status FROM orders WHERE reference = ?', [reference])
  if (r[0]?.status === 'cancelled') {
    // paid after the hold ran out and the stock was released: the merchant must check stock and refund or re-confirm
    console.warn(`[payments] ⚠ ${reference} was paid (${method} ${ref}) after it had been cancelled for non-payment — check stock`)
  }
  await pool.query(
    "UPDATE orders SET payment_status = 'paid', paid_at = NOW(), payment_ref = ? WHERE reference = ? AND payment_method = ? AND payment_status <> 'paid'",
    [ref, reference, method],
  )
}

async function markFailed(reference: string) {
  await pool.query("UPDATE orders SET payment_status = 'failed' WHERE reference = ? AND payment_status = 'awaiting'", [reference])
}

/* ---------- what the checkout may offer ---------- */

payments.get('/payments/config', (_req, res) => {
  const body: PaymentConfig = {
    card: cmiEnabled(),
    paypal: paypalEnabled()
      ? { clientId: config.paypal.clientId, currency: config.paypal.currency, madPerUnit: config.paypal.madPerUnit, sandbox: !config.paypal.live }
      : null,
  }
  res.json(body)
})

/* ---------- CMI ---------- */

const cmiEscape = (v: string) => v.replace(/\\/g, '\\\\').replace(/\|/g, '\\|')

/** CMI hash "ver3": parameters sorted by name (case-insensitive), values escaped and joined with |, then the store key */
export function cmiHash(params: Record<string, string>, storeKey: string) {
  const keys = Object.keys(params)
    .filter((k) => !['hash', 'encoding'].includes(k.toLowerCase()))
    .sort((a, b) => {
      const x = a.toLowerCase()
      const y = b.toLowerCase()
      return x < y ? -1 : x > y ? 1 : 0
    })
  const plain = keys.map((k) => cmiEscape(String(params[k] ?? '').trim())).join('|') + '|' + cmiEscape(storeKey)
  return crypto.createHash('sha512').update(plain, 'utf8').digest('base64')
}

function cmiVerify(body: Record<string, unknown>) {
  const params: Record<string, string> = {}
  for (const [k, v] of Object.entries(body)) params[k] = Array.isArray(v) ? String(v[0]) : String(v ?? '')
  const received = params.HASH ?? params.hash ?? ''
  const expected = cmiHash(params, config.cmi.storeKey)
  const ok = received.length === expected.length && crypto.timingSafeEqual(Buffer.from(received), Buffer.from(expected))
  return { ok, params }
}

payments.post('/payments/cmi/:reference/start', rateLimit({ windowMs: 10 * 60_000, max: 20 }), async (req, res, next) => {
  try {
    if (!cmiEnabled()) return void res.status(409).json({ error: 'Card payment is not available yet' })
    const o = await findOrder(String(req.params.reference))
    if (!payable(o, 'card') || !o) return void res.status(409).json({ error: 'This order cannot be paid by card' })
    if (!o.email) return void res.status(409).json({ error: 'An email is needed to pay online' })
    const lang = ['fr', 'ar', 'en'].includes(req.body?.lang) ? req.body.lang : 'fr'
    const api = `${config.publicUrl}/api/payments/cmi`
    const fields: Record<string, string> = {
      clientid: config.cmi.clientId,
      amount: o.total_mad.toFixed(2),
      currency: '504', // MAD
      oid: o.reference,
      okUrl: `${api}/return`,
      failUrl: `${api}/return`,
      callbackUrl: `${api}/callback`,
      shopurl: `${config.publicUrl}/order/${o.reference}`,
      TranType: 'PreAuth',
      storetype: '3D_PAY_HOSTING',
      hashAlgorithm: 'ver3',
      CallbackResponse: 'true',
      AutoRedirect: 'true',
      refreshtime: '5',
      lang,
      rnd: crypto.randomBytes(10).toString('hex'),
      BillToName: o.full_name,
      email: o.email,
      tel: o.phone,
      encoding: 'UTF-8',
    }
    fields.HASH = cmiHash(fields, config.cmi.storeKey)
    await pool.query("UPDATE orders SET payment_status = 'awaiting' WHERE id = ?", [o.id])
    res.json({ action: config.cmi.gatewayUrl, fields })
  } catch (e) {
    next(e)
  }
})

const form = express.urlencoded({ extended: false, limit: '20kb' })
const approved = (p: Record<string, string>) => p.ProcReturnCode === '00' && (p.Response ?? '').toLowerCase() === 'approved'

/** server-to-server: CMI expects a plain-text answer */
payments.post('/payments/cmi/callback', form, async (req, res) => {
  try {
    if (!cmiEnabled()) return void res.type('text').send('FAILURE')
    const { ok, params } = cmiVerify(req.body ?? {})
    if (!ok) return void res.type('text').send('FAILURE')
    const o = await findOrder(params.oid ?? '')
    if (!o || o.payment_method !== 'card') return void res.type('text').send('FAILURE')
    if (approved(params) && Number(params.amount) === o.total_mad) {
      await markPaid(o.reference, 'card', params.TransId || params.AuthCode || 'cmi')
      return void res.type('text').send('ACTION=POSTAUTH')
    }
    await markFailed(o.reference)
    res.type('text').send('APPROVED') // acknowledged; the payment itself was declined
  } catch (e) {
    console.error('[cmi callback]', e)
    res.type('text').send('FAILURE')
  }
})

/** the visitor's browser comes back here (okUrl and failUrl), then goes on to the order page */
payments.post('/payments/cmi/return', form, async (req, res) => {
  const { ok, params } = cmiVerify(req.body ?? {})
  const ref = /^GN-[A-Z0-9]{6}$/.test(params.oid ?? '') ? params.oid : ''
  if (!ref) return void res.redirect(303, `${config.publicUrl}/`)
  let result = 'failed'
  if (ok) {
    const o = await findOrder(ref).catch(() => null)
    if (o && approved(params) && Number(params.amount) === o.total_mad) {
      await markPaid(ref, 'card', params.TransId || params.AuthCode || 'cmi').catch(() => {})
      result = 'ok'
    } else await markFailed(ref).catch(() => {})
  }
  res.redirect(303, `${config.publicUrl}/order/${ref}?payment=${result}`)
})

/* ---------- PayPal ---------- */

const paypalBase = () => (config.paypal.live ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com')

let tokenCache: { token: string; until: number } | null = null
async function paypalToken() {
  if (tokenCache && tokenCache.until > Date.now()) return tokenCache.token
  const auth = Buffer.from(`${config.paypal.clientId}:${config.paypal.secret}`).toString('base64')
  const r = await fetch(`${paypalBase()}/v1/oauth2/token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  })
  if (!r.ok) throw new Error(`PayPal auth failed (${r.status})`)
  const j = (await r.json()) as { access_token: string; expires_in: number }
  tokenCache = { token: j.access_token, until: Date.now() + (j.expires_in - 60) * 1000 }
  return j.access_token
}

async function paypal<T>(path: string, init: RequestInit = {}) {
  const r = await fetch(`${paypalBase()}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${await paypalToken()}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  })
  const body = (await r.json().catch(() => ({}))) as T & { name?: string; details?: { issue?: string }[] }
  return { ok: r.ok, status: r.status, body }
}

const toPaypalAmount = (mad: number) => (mad / config.paypal.madPerUnit).toFixed(2)

interface PaypalOrder {
  id: string
  status: string
  purchase_units?: { reference_id?: string; payments?: { captures?: { id: string; status: string; amount: { value: string; currency_code: string } }[] } }[]
}

payments.post('/payments/paypal/:reference/create', rateLimit({ windowMs: 10 * 60_000, max: 20 }), async (req, res, next) => {
  try {
    if (!paypalEnabled()) return void res.status(409).json({ error: 'PayPal is not available yet' })
    const o = await findOrder(String(req.params.reference))
    if (!payable(o, 'paypal') || !o) return void res.status(409).json({ error: 'This order cannot be paid with PayPal' })
    const r = await paypal<PaypalOrder>('/v2/checkout/orders', {
      method: 'POST',
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: o.reference,
            custom_id: o.reference,
            description: `GNAWA order ${o.reference}`,
            amount: { currency_code: config.paypal.currency, value: toPaypalAmount(o.total_mad) },
          },
        ],
        application_context: { shipping_preference: 'NO_SHIPPING', brand_name: 'GNAWA' },
      }),
    })
    if (!r.ok) throw new Error(`PayPal create failed (${r.status} ${r.body.name ?? ''})`)
    await pool.query("UPDATE orders SET payment_ref = ?, payment_status = 'awaiting' WHERE id = ?", [r.body.id, o.id])
    res.json({ id: r.body.id })
  } catch (e) {
    next(e)
  }
})

payments.post('/payments/paypal/:reference/capture', rateLimit({ windowMs: 10 * 60_000, max: 20 }), async (req, res, next) => {
  try {
    if (!paypalEnabled()) return void res.status(409).json({ error: 'PayPal is not available yet' })
    const o = await findOrder(String(req.params.reference))
    if (!o || o.payment_method !== 'paypal' || !o.payment_ref) return void res.status(409).json({ error: 'This order cannot be paid with PayPal' })
    if (o.payment_status === 'paid') return void res.json({ status: 'paid' })

    // the id is the one we stored at creation, never one sent by the browser
    let r = await paypal<PaypalOrder>(`/v2/checkout/orders/${encodeURIComponent(o.payment_ref)}/capture`, { method: 'POST' })
    if (!r.ok && r.body.details?.[0]?.issue === 'ORDER_ALREADY_CAPTURED') r = await paypal<PaypalOrder>(`/v2/checkout/orders/${encodeURIComponent(o.payment_ref)}`)
    const unit = r.body.purchase_units?.[0]
    const capture = unit?.payments?.captures?.[0]
    const paid =
      r.ok &&
      r.body.status === 'COMPLETED' &&
      unit?.reference_id === o.reference &&
      capture?.status === 'COMPLETED' &&
      capture.amount.currency_code === config.paypal.currency &&
      capture.amount.value === toPaypalAmount(o.total_mad)
    if (!paid) {
      await markFailed(o.reference)
      return void res.status(402).json({ error: 'The PayPal payment was not completed' })
    }
    await markPaid(o.reference, 'paypal', capture!.id)
    res.json({ status: 'paid' })
  } catch (e) {
    next(e)
  }
})

/* ---------- releasing unpaid orders ---------- */

export function startUnpaidSweeper() {
  const run = async () => {
    let conn
    try {
      conn = await pool.getConnection()
      await conn.beginTransaction()
      const [rows] = await conn.query<RowDataPacket[]>(
        `SELECT id, reference FROM orders
         WHERE status = 'pending' AND payment_status IN ('awaiting', 'failed') AND created_at < (NOW() - INTERVAL ? MINUTE)
         FOR UPDATE`,
        [config.unpaidHoldMinutes],
      )
      for (const r of rows) {
        await restock(conn, r.id)
        await conn.query("UPDATE orders SET status = 'cancelled' WHERE id = ?", [r.id])
        console.log(`… released unpaid order ${r.reference}`)
      }
      await conn.commit()
    } catch (e) {
      await conn?.rollback().catch(() => {})
      if ((e as { code?: string })?.code !== 'ECONNREFUSED') console.error('[sweeper]', e)
    } finally {
      conn?.release()
    }
  }
  setTimeout(run, 15_000).unref()
  setInterval(run, 5 * 60_000).unref()
}
