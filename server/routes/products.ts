import { Router } from 'express'
import type { RowDataPacket } from 'mysql2'
import { pool } from '../db'
import type { Category, Product } from '../../shared/schemas'

export const products = Router()

export interface ProductRow extends RowDataPacket {
  id: number
  slug: string
  category: string
  name: string
  subtitle: string
  description: string
  price_mad: number
  image: string | null
  model: string | null
  specs_json: string
  stock: number
  is_demo: number
}
export interface VariantRow extends RowDataPacket {
  id: number
  product_id: number
  name: string
  price_delta: number
  stock: number
}

async function hydrate(rows: ProductRow[]): Promise<Product[]> {
  if (!rows.length) return []
  const [vars] = await pool.query<VariantRow[]>('SELECT * FROM variants WHERE product_id IN (?) ORDER BY id', [rows.map((r) => r.id)])
  return rows.map((r) => {
    const variants = vars
      .filter((v) => v.product_id === r.id)
      .map((v) => ({ id: v.id, name: v.name, priceDelta: v.price_delta, stock: v.stock }))
    return {
      id: r.id,
      slug: r.slug,
      category: r.category as Product['category'],
      name: r.name,
      subtitle: r.subtitle,
      description: r.description,
      price: r.price_mad,
      image: r.image,
      model: (r.model as Product['model']) ?? null,
      specs: JSON.parse(r.specs_json),
      variants,
      stock: variants.length ? variants.reduce((a, v) => a + v.stock, 0) : r.stock,
      demo: !!r.is_demo,
    }
  })
}

products.get('/categories', async (_req, res, next) => {
  try {
    const [rows] = await pool.query<(RowDataPacket & Category)[]>('SELECT slug, name, tagline, position FROM categories ORDER BY position')
    res.json(rows)
  } catch (e) {
    next(e)
  }
})

products.get('/products', async (req, res, next) => {
  try {
    const cat = typeof req.query.category === 'string' ? req.query.category : null
    const [rows] = cat
      ? await pool.query<ProductRow[]>('SELECT * FROM products WHERE category = ? ORDER BY position', [cat])
      : await pool.query<ProductRow[]>('SELECT * FROM products ORDER BY position')
    res.json(await hydrate(rows))
  } catch (e) {
    next(e)
  }
})

products.get('/products/:slug', async (req, res, next) => {
  try {
    const [rows] = await pool.query<ProductRow[]>('SELECT * FROM products WHERE slug = ?', [req.params.slug])
    const [p] = await hydrate(rows)
    if (!p) return void res.status(404).json({ error: 'Product not found' })
    res.json(p)
  } catch (e) {
    next(e)
  }
})
