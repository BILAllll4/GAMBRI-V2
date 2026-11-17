/** Types + validation shared by the React app and the Express API. */
import { z } from 'zod'

export const CATEGORY_SLUGS = ['guembri', 'qraqeb', 'accessories', 'clothing', 'exclusive'] as const
export type CategorySlug = (typeof CATEGORY_SLUGS)[number]

export interface Category {
  slug: CategorySlug
  name: string
  tagline: string
  position: number
}

export interface Variant {
  id: number
  name: string // e.g. "Natural walnut"
  priceDelta: number // MAD, added to the product price
  stock: number
}

export interface Product {
  id: number
  slug: string
  category: CategorySlug
  name: string
  subtitle: string
  description: string
  price: number // MAD (integer dirhams)
  image: string | null // path under /public, or null → designed placeholder
  model: 'guembri' | 'qraqeb' | null // interactive 3D viewer available
  specs: { label: string; value: string }[]
  variants: Variant[]
  stock: number // total across variants (or product stock when no variants)
  demo: boolean // true while the catalogue is sample data
}

/** Moroccan mobile/landline numbers: 06/07/05xxxxxxxx or +212 6/7/5xxxxxxxx */
export const MA_PHONE = /^(?:\+212|00212|0)[5-7]\d{8}$/

export const PAYMENT_METHODS = ['cod', 'card', 'paypal'] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]
/** none = cash on delivery; awaiting / failed / paid = online payment (card through CMI, or PayPal) */
export type PaymentStatus = 'none' | 'awaiting' | 'paid' | 'failed'

/** what the checkout may offer, read from the server's configuration */
export interface PaymentConfig {
  card: boolean
  paypal: { clientId: string; currency: string; madPerUnit: number; sandbox: boolean } | null
}

export const orderInputSchema = z
  .object({
  customer: z.object({
    fullName: z.string().trim().min(3, 'Please enter your full name').max(120),
    phone: z
      .string()
      .transform((s) => s.replace(/[\s.-]/g, ''))
      .refine((s) => MA_PHONE.test(s), 'Enter a Moroccan number, e.g. 06 12 34 56 78'),
    email: z.union([z.literal(''), z.string().trim().email('Enter a valid email')]).optional(),
  }),
  delivery: z.object({
    city: z.string().trim().min(2, 'Choose your city').max(80),
    address: z.string().trim().min(8, 'Enter street, number and district').max(300),
    postalCode: z.union([z.literal(''), z.string().trim().regex(/^\d{5}$/, 'Postal codes have 5 digits')]).optional(),
    notes: z.string().trim().max(500).optional(),
  }),
  payment: z.enum(PAYMENT_METHODS),
  items: z
    .array(
      z.object({
        productId: z.number().int().positive(),
        variantId: z.number().int().positive().nullable(),
        quantity: z.number().int().min(1).max(10),
      }),
    )
    .min(1, 'Your cart is empty')
    .max(30),
  })
  .superRefine((o, ctx) => {
    // the card gateway and PayPal both send the receipt by email
    if (o.payment !== 'cod' && !o.customer.email) {
      ctx.addIssue({ code: 'custom', path: ['customer', 'email'], message: 'An email is needed to pay online' })
    }
  })
export type OrderInput = z.input<typeof orderInputSchema>
export type OrderParsed = z.output<typeof orderInputSchema>

export interface OrderSummary {
  reference: string
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'
  paymentMethod: PaymentMethod
  paymentStatus: PaymentStatus
  firstName: string
  city: string
  createdAt: string
  items: { name: string; variant: string | null; quantity: number; unitPrice: number; lineTotal: number }[]
  subtotal: number
  shipping: number
  total: number
}

/* ---------- reviews ---------- */

export const ORDER_REF = /^GN-[A-HJ-NP-Z2-9]{6}$/

export const reviewInputSchema = z.object({
  name: z.string().trim().min(2, 'Please enter your name').max(60),
  rating: z.number().int().min(1, 'Choose a rating').max(5),
  body: z.string().trim().min(10, 'Write at least a few words (10 characters)').max(1000),
  /** optional: an order reference that contains this product marks the review as a verified purchase */
  orderRef: z.union([z.literal(''), z.string().trim().toUpperCase().regex(ORDER_REF, 'A reference looks like GN-3MW6WQ')]).optional(),
  /** honeypot: hidden from people, filled by bots */
  website: z.string().max(0).optional(),
})
export type ReviewInput = z.input<typeof reviewInputSchema>

export interface Review {
  id: number
  name: string
  rating: number
  body: string
  verified: boolean
  createdAt: string
}

export interface ReviewSummary {
  average: number // 0 when there are no reviews
  count: number
  reviews: Review[]
}

export interface AdminReview extends Review {
  approved: boolean
  product: { slug: string; name: string }
}

export const MOROCCAN_CITIES = [
  'Casablanca', 'Rabat', 'Marrakech', 'Fès', 'Tanger', 'Agadir', 'Essaouira', 'Meknès', 'Oujda', 'Kénitra',
  'Tétouan', 'Salé', 'El Jadida', 'Safi', 'Nador', 'Béni Mellal', 'Ouarzazate', 'Laâyoune', 'Dakhla', 'Autre / Other',
]
