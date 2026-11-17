import { formatMAD } from './api'
import type { Product } from '../../shared/schemas'

/** the lowest price a product can be bought at (its cheapest variant) */
export function fromPrice(p: Product) {
  const deltas = p.variants.map((v) => v.priceDelta)
  return p.price + (deltas.length ? Math.min(...deltas) : 0)
}

/** "4.800 MAD", or "From 4.800 MAD" when the variants are priced differently (pass the translated "From") */
export function priceLabel(p: Product, fromWord = 'From') {
  const deltas = p.variants.map((v) => v.priceDelta)
  const from = deltas.length > 1 && Math.max(...deltas) > Math.min(...deltas)
  return `${from ? fromWord + ' ' : ''}${formatMAD(fromPrice(p))}`
}
