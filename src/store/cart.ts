import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Product } from '../../shared/schemas'
import { track } from '../lib/analytics'

export interface CartLine {
  key: string // productId:variantId
  productId: number
  variantId: number | null
  slug: string
  name: string
  variantName: string | null
  unitPrice: number // MAD, display only — the server recomputes on checkout
  image: string | null
  quantity: number
  maxQty: number
}

interface CartState {
  lines: CartLine[]
  open: boolean
  add: (p: Product, variantId: number | null, qty: number) => void
  setQty: (key: string, qty: number) => void
  remove: (key: string) => void
  clear: () => void
  setOpen: (open: boolean) => void
}

export const MAX_PER_LINE = 10

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      open: false,
      add: (p, variantId, qty) =>
        set((s) => {
          const v = p.variants.find((x) => x.id === variantId) ?? null
          track('add_to_cart', { product: p.slug, variant: v?.name ?? '', quantity: qty, value: (p.price + (v?.priceDelta ?? 0)) * qty })
          const key = `${p.id}:${variantId ?? 0}`
          const maxQty = Math.min(MAX_PER_LINE, v ? v.stock : p.stock)
          const existing = s.lines.find((l) => l.key === key)
          if (existing) {
            return {
              open: true,
              lines: s.lines.map((l) => (l.key === key ? { ...l, maxQty, quantity: Math.min(maxQty, l.quantity + qty) } : l)),
            }
          }
          const line: CartLine = {
            key,
            productId: p.id,
            variantId,
            slug: p.slug,
            name: p.name,
            variantName: v?.name ?? null,
            unitPrice: p.price + (v?.priceDelta ?? 0),
            image: p.image,
            quantity: Math.min(maxQty, qty),
            maxQty,
          }
          return { open: true, lines: [...s.lines, line] }
        }),
      setQty: (key, qty) =>
        set((s) => ({ lines: s.lines.map((l) => (l.key === key ? { ...l, quantity: Math.max(1, Math.min(l.maxQty, qty)) } : l)) })),
      remove: (key) => set((s) => ({ lines: s.lines.filter((l) => l.key !== key) })),
      clear: () => set({ lines: [] }),
      setOpen: (open) => set({ open }),
    }),
    { name: 'gnawa-cart', version: 1, partialize: (s) => ({ lines: s.lines }) },
  ),
)

export const cartCount = (lines: CartLine[]) => lines.reduce((a, l) => a + l.quantity, 0)
export const cartSubtotal = (lines: CartLine[]) => lines.reduce((a, l) => a + l.quantity * l.unitPrice, 0)
