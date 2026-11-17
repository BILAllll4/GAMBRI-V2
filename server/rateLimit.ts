import type { RequestHandler } from 'express'

/**
 * A small in-memory, per-IP fixed-window limiter (one API process).
 * Enough to stop a script from flooding orders or reviews; put a shared store
 * (Redis) behind it if the API ever runs as several processes.
 */
export function rateLimit({ windowMs, max }: { windowMs: number; max: number }): RequestHandler {
  const hits = new Map<string, { n: number; reset: number }>()
  return (req, res, next) => {
    const now = Date.now()
    const key = req.ip ?? 'unknown'
    let h = hits.get(key)
    if (!h || h.reset <= now) {
      h = { n: 0, reset: now + windowMs }
      hits.set(key, h)
    }
    h.n++
    if (hits.size > 10_000) for (const [k, v] of hits) if (v.reset <= now) hits.delete(k)
    if (h.n > max) {
      res.setHeader('Retry-After', String(Math.ceil((h.reset - now) / 1000)))
      return void res.status(429).json({ error: 'Too many attempts. Please wait a few minutes and try again.' })
    }
    next()
  }
}
