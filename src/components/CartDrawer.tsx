import { AnimatePresence, motion } from 'framer-motion'
import { useEffect } from 'react'
import { useCart, cartSubtotal } from '../store/cart'
import { formatMAD } from '../lib/api'
import { useTransitionNavigate } from './Curtain'
import { ProductArt } from './ProductArt'
import { artFor, visualFor } from '../data/collection'
import { QtyStepper } from './QtyStepper'
import { useT } from '../lib/i18n'
import { C } from '../lib/copy'

/** the piece on a small sand plate: its photograph when it is presented by one, otherwise its illustration (the drawer sits above the 3D canvas) */
function Thumb({ slug, image, name }: { slug: string; image: string | null; name: string }) {
  const v = visualFor(slug, undefined, image)
  return (
    <div className="relative h-28 w-[90px] shrink-0 overflow-hidden bg-[radial-gradient(ellipse_at_50%_28%,#f7f0e2_0%,#ece0c8_55%,#e0d0b2_100%)]">
      {v.kind === 'photo' && image ? <img src={image} alt={name} className="h-full w-full object-cover" /> : <ProductArt art={artFor(v)} className="absolute inset-[14%] h-[72%] w-[72%] text-emerald/70" />}
    </div>
  )
}

export function CartDrawer() {
  const t = useT()
  const { lines, open, setOpen, setQty, remove } = useCart()
  const go = useTransitionNavigate()
  const subtotal = cartSubtotal(lines)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, setOpen])

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[88] flex justify-end" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <button className="absolute inset-0 bg-ink/50" aria-label={t(C.closeCart)} onClick={() => setOpen(false)} />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label={t(C.yourCart)}
            initial={{ x: '100%' }}
            animate={{ x: 0, transition: { duration: 0.6, ease: [0.76, 0, 0.24, 1] } }}
            exit={{ x: '100%', transition: { duration: 0.45, ease: [0.76, 0, 0.24, 1] } }}
            className="relative flex h-full w-full max-w-md flex-col bg-[#f4eee2] text-emerald"
            data-lenis-prevent
          >
            <div className="flex items-center justify-between border-b border-emerald/10 px-6 py-5">
              <p className="label text-brass">{t(C.yourCart)}</p>
              <button onClick={() => setOpen(false)} className="label text-emerald/60 hover:text-emerald">{t(C.close)}</button>
            </div>

            {lines.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-6 px-8 text-center">
                <p className="display text-4xl text-emerald">{t(C.emptyDrawer)}</p>
                <p className="text-sm text-emerald/60">{t(C.emptyDrawerLead)}</p>
                <button
                  onClick={() => {
                    setOpen(false)
                    go('/store', { tone: 'gold', label: 'The collection' })
                  }}
                  className="label bg-emerald px-6 py-3 text-ivory transition-colors hover:bg-forest"
                >
                  {t(C.explore)}
                </button>
              </div>
            ) : (
              <>
                <ul className="flex-1 divide-y divide-emerald/10 overflow-y-auto px-6">
                  {lines.map((l) => (
                    <li key={l.key} className="flex gap-4 py-5">
                      <Thumb slug={l.slug} image={l.image} name={l.name} />
                      <div className="flex min-w-0 flex-1 flex-col">
                        <p className="display text-xl leading-tight text-emerald">{l.name}</p>
                        {l.variantName && <p className="mt-1 text-[12px] text-emerald/55">{l.variantName}</p>}
                        <div className="mt-auto flex items-end justify-between pt-3">
                          <QtyStepper value={l.quantity} max={l.maxQty} onChange={(q) => setQty(l.key, q)} small tone="light" />
                          <div className="text-right">
                            <p className="text-sm text-emerald">{formatMAD(l.unitPrice * l.quantity)}</p>
                            <button onClick={() => remove(l.key)} className="mt-1 text-[11px] text-emerald/45 underline-offset-4 hover:text-emerald hover:underline">
                              {t(C.remove)}
                            </button>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="border-t border-emerald/10 bg-[#ebe2d0] px-6 py-6">
                  <div className="flex justify-between text-sm text-emerald/70">
                    <span>{t(C.subtotal)}</span>
                    <span className="display text-xl text-emerald">{formatMAD(subtotal)}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-emerald/50">{t(C.drawerNote)}</p>
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <button onClick={() => (setOpen(false), go('/cart'))} className="label border border-emerald/25 py-4 text-emerald/80 transition-colors hover:border-emerald/60">
                      {t(C.viewCart)}
                    </button>
                    <button onClick={() => (setOpen(false), go('/checkout'))} className="label bg-emerald py-4 text-ivory transition-colors hover:bg-forest">
                      {t(C.checkoutShort)}
                    </button>
                  </div>
                </div>
              </>
            )}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
