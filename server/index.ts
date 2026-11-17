import express, { type ErrorRequestHandler } from 'express'
import cors from 'cors'
import { config } from './config'
import { pool } from './db'
import { ensureSchema } from './migrate'
import { products } from './routes/products'
import { orders } from './routes/orders'
import { payments, startUnpaidSweeper } from './routes/payments'
import { reviews, admin } from './routes/reviews'

const app = express()
app.disable('x-powered-by')
app.set('trust proxy', config.trustProxy)
app.use(cors({ origin: config.corsOrigin }))
app.use(express.json({ limit: '50kb' }))

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1')
    res.json({ ok: true, db: 'up' })
  } catch {
    res.status(503).json({ ok: false, db: 'down' })
  }
})
app.use('/api', products)
app.use('/api', orders)
app.use('/api', payments)
app.use('/api', reviews)
app.use('/api', admin)
app.use('/api', (_req, res) => void res.status(404).json({ error: 'Not found' }))

const onError: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error('[api]', err)
  const dbDown = ['ECONNREFUSED', 'ER_ACCESS_DENIED_ERROR', 'ER_BAD_DB_ERROR', 'ER_NO_SUCH_TABLE'].includes(err?.code)
  res.status(dbDown ? 503 : 500).json({
    error: dbDown ? 'The store database is unavailable. Run `npm run db:setup` and check MySQL.' : 'Something went wrong',
  })
}
app.use(onError)

ensureSchema().catch((e) => console.warn('… schema check skipped:', e?.code ?? e?.message))
startUnpaidSweeper()

app.listen(config.port, () => console.log(`✓ GNAWA API on http://localhost:${config.port}`))
