import { Router } from 'express'
import crypto from 'node:crypto'
import type { ResultSetHeader, RowDataPacket } from 'mysql2'
import type { PoolConnection } from 'mysql2/promise'
import { pool } from '../db'
import { config, cmiEnabled, paypalEnabled } from '../config'
import { rateLimit } from '../rateLimit'
import { orderInputSchema, type OrderSummary } from '../../shared/schemas'
import type { ProductRow, VariantRow } from './products'

export const orders = Router()

class HttpError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message)
  }
}

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no 0/O/1/I
function makeReference() {
  const bytes = crypto.randomBytes(6)
  return 'GN-' + Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('')
}

/** normalise to +212XXXXXXXXX so the same customer is matched however they type it */
function normalisePhone(p: string) {
  const digits = p.replace(/^(\+212|00212|0)/, '')
  return '+212' + digits
}

/** puts an order's items back into stock (cancelled or never paid) */
export async function restock(conn: PoolConnection, orderId: number) {
  const [items] = await conn.query<RowDataPacket[]>('SELECT product_id, variant_id, quantity FROM order_items WHERE order_id = ?', [orderId])
  for (const i of items) {
    if (i.variant_id) await conn.query('UPDATE variants SET stock = stock + ? WHERE id = ?', [i.quantity, i.variant_id])
    else await conn.query('UPDATE products SET stock = stock + ? WHERE id = ?', [i.quantity, i.product_id])
  }
}

/**
 * Create an order: cash on delivery, or reserved for online payment (card / PayPal).
 * Prices and stock are always read from the database inside a transaction —
 * the client only sends product ids, variant ids and quantities.
 */
orders.post('/orders', rateLimit({ windowMs: 15 * 60_000, max: 8 }), async (req, res, next) => {
  const parsed = orderInputSchema.safeParse(req.body)
  if (!parsed.success) {
    return void res.status(422).json({ error: 'Please check the highlighted fields', issues: parsed.error.issues })
  }
  const input = parsed.data
  if (input.payment === 'card' && !cmiEnabled()) return void res.status(409).json({ error: 'Card payment is not available yet' })
  if (input.payment === 'paypal' && !paypalEnabled()) return void res.status(409).json({ error: 'PayPal is not available yet' })

  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    const productIds = [...new Set(input.items.map((i) => i.productId))]
    const [prows] = await conn.query<ProductRow[]>('SELECT * FROM products WHERE id IN (?) FOR UPDATE', [productIds])
    const [vrows] = await conn.query<VariantRow[]>('SELECT * FROM variants WHERE product_id IN (?) FOR UPDATE', [productIds])

    // merge duplicate lines
    const merged = new Map<string, { productId: number; variantId: number | null; quantity: number }>()
    for (const it of input.items) {
      const k = `${it.productId}:${it.variantId ?? 0}`
      const prev = merged.get(k)
      merged.set(k, { ...it, quantity: (prev?.quantity ?? 0) + it.quantity })
    }

    const lines: { productId: number; variantId: number | null; name: string; variantName: string | null; unit: number; qty: number }[] = []
    for (const it of merged.values()) {
      const p = prows.find((r) => r.id === it.productId)
      if (!p) throw new HttpError(409, 'A product in your cart is no longer available')
      const pVariants = vrows.filter((v) => v.product_id === p.id)
      let unit = p.price_mad
      let available = p.stock
      let variantName: string | null = null
      if (pVariants.length) {
        const v = pVariants.find((x) => x.id === it.variantId)
        if (!v) throw new HttpError(409, `Please choose an option for ${p.name}`)
        unit += v.price_delta
        available = v.stock
        variantName = v.name
      } else if (it.variantId !== null) {
        throw new HttpError(409, `${p.name} has no options`)
      }
      if (available < it.quantity) {
        throw new HttpError(409, available === 0 ? `${p.name} is out of stock` : `Only ${available} left of ${p.name}${variantName ? ` (${variantName})` : ''}`)
      }
      lines.push({ productId: p.id, variantId: it.variantId, name: p.name, variantName, unit, qty: it.quantity })
    }

    const subtotal = lines.reduce((a, l) => a + l.unit * l.qty, 0)
    const shipping = config.shippingFlatMad
    const total = subtotal + shipping

    const phone = normalisePhone(input.customer.phone)
    await conn.query(
      `INSERT INTO customers (full_name, phone, email) VALUES (?,?,?)
       ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), email = COALESCE(VALUES(email), email), id = LAST_INSERT_ID(id)`,
      [input.customer.fullName, phone, input.customer.email || null],
    )
    const [[{ id: customerId }]] = await conn.query<(RowDataPacket & { id: number })[]>('SELECT LAST_INSERT_ID() AS id')

    let reference = makeReference()
    for (let tries = 0; tries < 5; tries++) {
      const [dup] = await conn.query<RowDataPacket[]>('SELECT id FROM orders WHERE reference = ?', [reference])
      if (!dup.length) break
      reference = makeReference()
    }

    // online orders hold their stock while the visitor pays; unpaid ones are released (see payments.ts)
    const paymentStatus = input.payment === 'cod' ? 'none' : 'awaiting'
    const [ord] = await conn.query<ResultSetHeader>(
      `INSERT INTO orders (reference, customer_id, status, payment_method, payment_status, city, address, postal_code, notes, subtotal_mad, shipping_mad, total_mad)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [reference, customerId, 'pending', input.payment, paymentStatus, input.delivery.city, input.delivery.address, input.delivery.postalCode || null, input.delivery.notes || null, subtotal, shipping, total],
    )
    for (const l of lines) {
      await conn.query(
        'INSERT INTO order_items (order_id, product_id, variant_id, name, variant_name, unit_price, quantity) VALUES (?,?,?,?,?,?,?)',
        [ord.insertId, l.productId, l.variantId, l.name, l.variantName, l.unit, l.qty],
      )
      if (l.variantId) await conn.query('UPDATE variants SET stock = stock - ? WHERE id = ?', [l.qty, l.variantId])
      else await conn.query('UPDATE products SET stock = stock - ? WHERE id = ?', [l.qty, l.productId])
    }

    await conn.commit()
    res.status(201).json({ reference, total, payment: input.payment })
  } catch (e) {
    await conn.rollback().catch(() => {})
    if (e instanceof HttpError) return void res.status(e.status).json({ error: e.message })
    next(e)
  } finally {
    conn.release()
  }
})

/** order confirmation — returns no phone, email or street address */
orders.get('/orders/:reference', rateLimit({ windowMs: 10 * 60_000, max: 120 }), async (req, res, next) => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT o.*, c.full_name FROM orders o JOIN customers c ON c.id = o.customer_id WHERE o.reference = ?`,
      [req.params.reference],
    )
    const o = rows[0]
    if (!o) return void res.status(404).json({ error: 'Order not found' })
    const [items] = await pool.query<RowDataPacket[]>('SELECT * FROM order_items WHERE order_id = ? ORDER BY id', [o.id])
    const summary: OrderSummary = {
      reference: o.reference,
      status: o.status,
      paymentMethod: o.payment_method,
      paymentStatus: o.payment_status ?? 'none',
      firstName: String(o.full_name).split(' ')[0],
      city: o.city,
      createdAt: o.created_at,
      items: items.map((i) => ({
        name: i.name,
        variant: i.variant_name,
        quantity: i.quantity,
        unitPrice: i.unit_price,
        lineTotal: i.unit_price * i.quantity,
      })),
      subtotal: o.subtotal_mad,
      shipping: o.shipping_mad,
      total: o.total_mad,
    }
    res.json(summary)
  } catch (e) {
    next(e)
  }
})
