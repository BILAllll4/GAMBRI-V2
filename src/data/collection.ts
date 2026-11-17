/**
 * How each catalogue product is PRESENTED (Full Collection, cart, portal).
 *
 * Names, prices, descriptions, stock and categories always come from the store
 * API (MySQL); this file only decides what fills each product's plate:
 *  - `guembri` / `qraqeb` / `object`: a live 3D model built for this site (the
 *    GLB guembri in a given finish, the procedural qraqeb, or a procedural
 *    accessory), which turns while the pointer is over it, or
 *  - `art`: a line illustration, labelled as such, for products that have no
 *    model and no photograph yet, or
 *  - `photo`: the product's own photograph (`products.image`).
 *
 * The seeded catalogue is DEMONSTRATION data (every product is flagged
 * `demo`). When real products and photographs arrive, put the photo path in
 * `products.image` and set `{ kind: 'photo' }` here, or add new slugs.
 * Products missing from this map get an illustration chosen by category.
 */
import type { CategorySlug } from '../../shared/schemas'
import type { GuembriFinish } from '../three/Guembri'
import type { QraqebFinish } from '../three/Qraqeb'
import type { AccessoryId } from '../three/Accessories'

export type ArtId = 'strings' | 'bindings' | 'bag' | 'cap' | 'tunic' | 'qraqeb' | 'guembri' | 'khatam'

export type Visual =
  | { kind: 'guembri'; finish: GuembriFinish; scale?: number }
  | { kind: 'qraqeb'; pairs: 1 | 2; finish?: QraqebFinish }
  | { kind: 'object'; id: AccessoryId }
  | { kind: 'art'; art: ArtId }
  | { kind: 'photo' }

export type ModelVisual = Extract<Visual, { kind: 'guembri' | 'qraqeb' | 'object' }>

export const PRESENTATION: Record<string, Visual> = {
  'guembri-practice': { kind: 'guembri', finish: 'natural' },
  'guembri-workshop-edition': { kind: 'guembri', finish: 'dark' },
  'collectors-guembri-numbered': { kind: 'guembri', finish: 'aged' },
  'guembri-traditional': { kind: 'guembri', finish: 'traditional' },
  'guembri-handmade': { kind: 'guembri', finish: 'handmade' },
  'guembri-premium-walnut': { kind: 'guembri', finish: 'premium' },
  'guembri-compact': { kind: 'guembri', finish: 'natural', scale: 0.84 },
  'qraqeb-forged-iron': { kind: 'qraqeb', pairs: 1 },
  'qraqeb-polished-steel': { kind: 'qraqeb', pairs: 1, finish: 'polished' },
  'rhythm-gift-set': { kind: 'qraqeb', pairs: 2 },
  'gut-string-set': { kind: 'object', id: 'strings' },
  'leather-tuning-bindings': { kind: 'object', id: 'bindings' },
  'guembri-carry-bag': { kind: 'object', id: 'bag' },
  'cowrie-embroidered-cap': { kind: 'object', id: 'cap' },
  'linen-stage-tunic': { kind: 'art', art: 'tunic' },
}

/**
 * A short editorial line per chapter, shown on a "chapter note" tile that fills
 * the last row of a chapter when its pieces do not fill it (so no row is ever
 * left with a gap). Plain description, no product claims.
 */
export const CHAPTER_NOTES: Record<CategorySlug, string> = {
  guembri: 'The three-stringed bass lute at the heart of the lila: a carved wooden body, a skin soundboard and gut strings.',
  qraqeb: 'Iron castanets played in pairs, one in each hand. Their pulse carries the rhythm under the guembri.',
  accessories: 'What keeps a guembri playing and travelling: gut strings, leather bindings and a padded case.',
  clothing: 'Textiles for the stage: caps sewn with cowrie shells and loose linen worn through a long night.',
  exclusive: 'Numbered pieces and boxed sets, made in small runs.',
}

/** pieces flagged "New" in the store (the latest additions to the demo catalogue) */
export const NEW_IN = new Set(['guembri-premium-walnut', 'guembri-handmade', 'guembri-traditional', 'guembri-compact', 'qraqeb-polished-steel'])

/** the piece featured in the store's opening banner */
export const FEATURED_SLUG = 'guembri-premium-walnut'

const BY_CATEGORY: Record<CategorySlug, ArtId> = {
  guembri: 'guembri',
  qraqeb: 'qraqeb',
  accessories: 'khatam',
  clothing: 'tunic',
  exclusive: 'khatam',
}

export function isModel(v: Visual): v is ModelVisual {
  return v.kind === 'guembri' || v.kind === 'qraqeb' || v.kind === 'object'
}

export function visualFor(slug: string, category: CategorySlug | undefined, image: string | null): Visual {
  const fallback: Visual = { kind: 'art', art: category ? BY_CATEGORY[category] : 'khatam' }
  const v = PRESENTATION[slug]
  if (v) return v.kind === 'photo' && !image ? fallback : v
  return image ? { kind: 'photo' } : fallback
}

/** the illustration that stands in for a model where no WebGL is available */
export function artFor(v: Visual): ArtId {
  if (v.kind === 'art') return v.art
  if (v.kind === 'guembri') return 'guembri'
  if (v.kind === 'qraqeb') return 'qraqeb'
  if (v.kind === 'object') return v.id
  return 'khatam'
}
