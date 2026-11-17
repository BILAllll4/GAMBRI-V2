/**
 * The three instruments shown in the showroom behind the portal.
 *
 * Names, prices and descriptions come from the store API (MySQL) when it is
 * running; the values below are the fallback and match server/seed.ts. They
 * are DEMONSTRATION prices (the catalogue is flagged is_demo) until the real
 * catalogue is defined. The 3D models are this project’s own
 * guembri in three finishes, not photographs of products for sale.
 */
import type { GuembriFinish } from '../three/Guembri'

export interface ShowroomItem {
  slug: string
  finish: GuembriFinish
  name: string
  price: number // MAD, including the variant below
  line: string // one-line description
  /** store variant matching the finish shown (its price delta is included) */
  variant?: string
}

export const SHOWROOM: ShowroomItem[] = [
  {
    slug: 'guembri-practice',
    finish: 'natural',
    name: 'Guembri — Practice Model',
    price: 2900,
    line: 'For learning the repertoire at home.',
  },
  {
    slug: 'guembri-workshop-edition',
    finish: 'dark',
    name: 'Guembri — Workshop Edition',
    price: 5100,
    variant: 'Dark-stained body',
    line: 'Carved body, camel-skin soundboard, dark-stained wood.',
  },
  {
    slug: 'collectors-guembri-numbered',
    finish: 'aged',
    name: 'Collector’s Guembri — Numbered',
    price: 9500,
    line: 'A numbered piece with a certificate.',
  },
]
