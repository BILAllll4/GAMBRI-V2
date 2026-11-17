/**
 * Customer reviews. Anyone can write one; it stays hidden until it is approved
 * at /admin/reviews (bearer ADMIN_TOKEN). A review that quotes an order
 * reference containing the product is marked "verified purchase".
 */
import { Router, type RequestHandler } from 'express'
import crypto from 'node:crypto'
import type { RowDataPacket } from 'mysql2'
import { pool } from '../db'
import { config } from '../config'
import { rateLimit } from '../rateLimit'
import { reviewInputSchema, type AdminReview, type Review, type ReviewSummary } from '../../shared/schemas'

export const reviews = Router()

const toReview = (r: RowDataPacket): Review => ({
  id: r.id,
  name: r.name,
  rating: r.rating,
  body: r.body,
  verified: !!r.verified,
  createdAt: r.created_at,
})

reviews.get('/products/:slug/reviews', async (req, res, next) => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT r.* FROM reviews r JOIN products p ON p.id = r.product_id
       WHERE p.slug = ? AND r.approved = 1 ORDER BY r.created_at DESC, r.id DESC LIMIT 100`,
      [req.params.slug],
    )
    const [[agg]] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS n, COALESCE(AVG(r.rating), 0) AS avg FROM reviews r JOIN products p ON p.id = r.product_id WHERE p.slug = ? AND r.approved = 1`,
      [req.params.slug],
    )
    const body: ReviewSummary = { count: Number(agg.n), average: Math.round(Number(agg.avg) * 10) / 10, reviews: rows.map(toReview) }
    res.json(body)
  } catch (e) {
    next(e)
  }
})

reviews.post('/products/:slug/reviews', rateLimit({ windowMs: 60 * 60_000, max: 4 }), async (req, res, next) => {
  try {
    const parsed = reviewInputSchema.safeParse(req.body)
    if (!parsed.success) return void res.status(422).json({ error: 'Please check the highlighted fields', issues: parsed.error.issues })
    const input = parsed.data
    const [prows] = await pool.query<RowDataPacket[]>('SELECT id FROM products WHERE slug = ?', [req.params.slug])
    const product = prows[0]
    if (!product) return void res.status(404).json({ error: 'Product not found' })

    let verified = false
    if (input.orderRef) {
      const [m] = await pool.query<RowDataPacket[]>(
        `SELECT 1 FROM orders o JOIN order_items i ON i.order_id = o.id
         WHERE o.reference = ? AND i.product_id = ? AND o.status <> 'cancelled' LIMIT 1`,
        [input.orderRef, product.id],
      )
      verified = m.length > 0
    }
    await pool.query('INSERT INTO reviews (product_id, name, rating, body, order_ref, verified) VALUES (?,?,?,?,?,?)', [
      product.id,
      input.name,
      input.rating,
      input.body,
      input.orderRef || null,
      verified ? 1 : 0,
    ])
    res.status(201).json({ status: 'pending', verified })
  } catch (e) {
    next(e)
  }
})

/* ---------- moderation ---------- */

const adminOnly: RequestHandler = (req, res, next) => {
  if (!config.adminToken) return void res.status(503).json({ error: 'Admin is closed: set ADMIN_TOKEN in .env and restart the API' })
  const given = Buffer.from(String(req.headers.authorization ?? '').replace(/^Bearer\s+/i, ''))
  const want = Buffer.from(config.adminToken)
  if (given.length !== want.length || !crypto.timingSafeEqual(given, want)) return void res.status(401).json({ error: 'Wrong admin token' })
  next()
}

export const admin = Router()
admin.use('/admin', rateLimit({ windowMs: 10 * 60_000, max: 200 }), adminOnly)

admin.get('/admin/reviews', async (req, res, next) => {
  try {
    const approved = req.query.status === 'approved' ? 1 : 0
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT r.*, p.slug, p.name AS product_name FROM reviews r JOIN products p ON p.id = r.product_id
       WHERE r.approved = ? ORDER BY r.created_at DESC LIMIT 200`,
      [approved],
    )
    const body: AdminReview[] = rows.map((r) => ({ ...toReview(r), approved: !!r.approved, product: { slug: r.slug, name: r.product_name } }))
    res.json(body)
  } catch (e) {
    next(e)
  }
})

admin.post('/admin/reviews/:id/approve', async (req, res, next) => {
  try {
    await pool.query('UPDATE reviews SET approved = 1 WHERE id = ?', [Number(req.params.id)])
    res.json({ ok: true })
  } catch (e) {
    next(e)
  }
})

admin.delete('/admin/reviews/:id', async (req, res, next) => {
  try {
    await pool.query('DELETE FROM reviews WHERE id = ?', [Number(req.params.id)])
    res.json({ ok: true })
  } catch (e) {
    next(e)
  }
})
