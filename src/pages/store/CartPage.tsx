/**
 * /cart — the selection, in the collection's editorial language (ivory ground,
 * emerald type, brass accents). Each line shows the piece on the same sand
 * plate as the collection, live in 3D (turns on hover) through one shared
 * canvas, or as its labelled illustration; then quantity, removal and the line
 * total. A sticky summary carries subtotal, delivery and the checkout. The
 * empty cart suggests three pieces instead of leaving a blank page.
 */
import { lazy, Suspense, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useCart, cartSubtotal, cartCount, type CartLine } from '../../store/cart'
import { api, formatMAD } from '../../lib/api'
import { useAsync } from '../../lib/useAsync'
import { hasWebGL } from '../../lib/device'
import { artFor, isModel, visualFor, type Visual } from '../../data/collection'
import { ProductArt } from '../../components/ProductArt'
import { QtyStepper } from '../../components/QtyStepper'
import { useTransitionNavigate } from '../../components/Curtain'
import { priceLabel } from '../../lib/price'
import type { Product } from '../../../shared/schemas'
import { useT } from '../../lib/i18n'
import { C } from '../../lib/copy'

const SharedCanvas = lazy(() => import('../../sections/showroom/ShowroomScene').then((m) => ({ default: m.ShowroomCanvas })))
const ProductView = lazy(() => import('./CollectionScene').then((m) => ({ default: m.ProductView })))

function MiniPlate({ visual, image, name, hover, on, webgl, index }: { visual: Visual; image: string | null; name: string; hover: React.RefObject<boolean>; on: boolean; webgl: boolean; index: number }) {
  return (
    <div className="relative aspect-[4/5] w-full overflow-hidden bg-[radial-gradient(ellipse_at_50%_28%,#f7f0e2_0%,#ece0c8_55%,#e0d0b2_100%)]">
      <div className={`pointer-events-none absolute inset-2 border transition-colors duration-700 ${on ? 'border-brass/70' : 'border-emerald/[0.08]'}`} />
      {isModel(visual) && webgl ? (
        <Suspense fallback={null}>
          <ProductView visual={visual} hover={hover} index={index} className="absolute inset-0" />
        </Suspense>
      ) : visual.kind === 'photo' && image ? (
        <img src={image} alt={name} className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <ProductArt art={artFor(visual)} className="absolute inset-[18%] h-[64%] w-[64%] text-emerald/70" />
      )}
    </div>
  )
}

function Line({ l, index, webgl }: { l: CartLine; index: number; webgl: boolean }) {
  const t = useT()
  const { setQty, remove } = useCart()
  const go = useTransitionNavigate()
  const hover = useRef(false)
  const [on, setOn] = useState(false)
  const visual = useMemo(() => visualFor(l.slug, undefined, l.image), [l.slug, l.image])
  const set = (v: boolean) => {
    hover.current = v
    setOn(v)
  }
  return (
    <motion.li layout exit={{ opacity: 0, height: 0 }} className="grid grid-cols-[96px_1fr] gap-5 border-b border-emerald/10 py-7 sm:grid-cols-[150px_1fr_auto] sm:gap-8">
      <button onClick={() => go(`/store/${l.slug}`, { tone: 'gold', label: l.name })} onPointerEnter={() => set(true)} onPointerLeave={() => set(false)} aria-label={`Open ${l.name}`}>
        <MiniPlate visual={visual} image={l.image} name={l.name} hover={hover} on={on} webgl={webgl} index={index} />
      </button>
      <div className="flex min-w-0 flex-col">
        <p className="label text-[10px] text-brass">{String(index + 1).padStart(2, '0')}</p>
        <button onClick={() => go(`/store/${l.slug}`, { tone: 'gold', label: l.name })} className="mt-2 text-left">
          <span className="display text-[clamp(22px,2.2vw,30px)] leading-[1.1] text-emerald hover:underline hover:decoration-brass hover:decoration-1 hover:underline-offset-4">{l.name}</span>
        </button>
        {l.variantName && <p className="mt-1 text-[13px] text-emerald/60">{l.variantName}</p>}
        <p className="mt-2 text-[13px] text-emerald/50">{formatMAD(l.unitPrice)} {t(C.each)}</p>
        <div className="mt-auto flex flex-wrap items-center gap-5 pt-5">
          <QtyStepper value={l.quantity} max={l.maxQty} onChange={(q) => setQty(l.key, q)} small tone="light" />
          <button onClick={() => remove(l.key)} className="label text-[10px] text-emerald/45 transition-colors hover:text-emerald">
            {t(C.remove)}
          </button>
        </div>
        <p className="display mt-4 text-xl text-emerald sm:hidden">{formatMAD(l.unitPrice * l.quantity)}</p>
      </div>
      <p className="display hidden text-2xl text-emerald sm:block sm:text-right">{formatMAD(l.unitPrice * l.quantity)}</p>
    </motion.li>
  )
}

function Suggestion({ p, index, webgl }: { p: Product; index: number; webgl: boolean }) {
  const t = useT()
  const go = useTransitionNavigate()
  const hover = useRef(false)
  const [on, setOn] = useState(false)
  const visual = useMemo(() => visualFor(p.slug, p.category, p.image), [p])
  const set = (v: boolean) => {
    hover.current = v
    setOn(v)
  }
  return (
    <li>
      <button onClick={() => go(`/store/${p.slug}`, { tone: 'gold', label: p.name })} onPointerEnter={() => set(true)} onPointerLeave={() => set(false)} className="group block w-full text-left">
        <MiniPlate visual={visual} image={p.image} name={p.name} hover={hover} on={on} webgl={webgl} index={index} />
        <span className="mt-4 flex items-baseline justify-between gap-3">
          <span className="display text-[20px] leading-tight text-emerald">{p.name}</span>
          <span className="display shrink-0 text-[16px] text-emerald/80">{priceLabel(p, t(C.from))}</span>
        </span>
      </button>
    </li>
  )
}

export default function CartPage() {
  const t = useT()
  const lines = useCart((s) => s.lines)
  const go = useTransitionNavigate()
  const subtotal = cartSubtotal(lines)
  const count = cartCount(lines)
  const webgl = useMemo(hasWebGL, [])
  const empty = lines.length === 0
  const products = useAsync(() => (empty ? api.products('guembri') : Promise.resolve([] as Product[])), [empty])
  const suggestions = (products.data ?? []).slice(0, 3)
  const hasModels = webgl && (empty ? suggestions.length > 0 : lines.length > 0)

  return (
    <div data-nav="light" className="min-h-screen bg-[#f4eee2] px-gutter pb-28 pt-[clamp(108px,16vh,160px)] text-emerald">
      <header className="flex flex-wrap items-end justify-between gap-6 border-b border-emerald/15 pb-8">
        <div>
          <p className="label flex items-center gap-4 text-brass">
            {t(C.yourSelection)}
            <span className="h-px w-10 bg-brass/50" />
            <span className="text-emerald/50">
              {count} {t(count === 1 ? C.piece : C.pieces)}
            </span>
          </p>
          <h1 className="display mt-4 text-[clamp(52px,8vw,120px)] leading-[0.92]">
            {t(C.cartTitle1)} <span className="italic text-moss">{t(C.cartTitle2)}</span>
          </h1>
        </div>
        {!empty && (
          <button onClick={() => go('/store', { tone: 'gold', label: 'The collection' })} className="label flex items-center gap-3 text-emerald/60 transition-colors hover:text-emerald">
            <span aria-hidden className="rtl:-scale-x-100">←</span> {t(C.continue)}
          </button>
        )}
      </header>

      {empty ? (
        <section className="mx-auto mt-[clamp(48px,9vh,96px)] max-w-5xl text-center">
          <p className="display text-[clamp(30px,3.4vw,46px)] leading-tight">{t(C.empty)}</p>
          <p className="mx-auto mt-3 max-w-[46ch] text-[14px] font-light leading-relaxed text-emerald/60">
            {t(C.emptyLead)}
          </p>
          <button onClick={() => go('/store', { tone: 'gold', label: 'The collection' })} className="label mt-8 bg-emerald px-8 py-4 text-ivory transition-colors hover:bg-forest">
            {t(C.explore)}
          </button>
          {suggestions.length > 0 && (
            <ul className="mx-auto mt-16 grid max-w-4xl grid-cols-1 gap-x-8 gap-y-12 text-left sm:grid-cols-3">
              {suggestions.map((p, i) => (
                <Suggestion key={p.id} p={p} index={i} webgl={webgl} />
              ))}
            </ul>
          )}
        </section>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-x-14 gap-y-12 lg:grid-cols-12">
          <ul className="lg:col-span-8">
            {lines.map((l, i) => (
              <Line key={l.key} l={l} index={i} webgl={webgl} />
            ))}
          </ul>

          <aside className="lg:col-span-4">
            <div className="sticky top-28 mt-7 border border-emerald/10 bg-[#ebe2d0] p-7 sm:p-8">
              <p className="label text-brass">{t(C.summary)}</p>
              <dl className="mt-6 space-y-3 text-[14px]">
                <div className="flex justify-between text-emerald/70">
                  <dt>
                    {t(C.subtotal)} · {count} {t(count === 1 ? C.piece : C.pieces)}
                  </dt>
                  <dd className="text-emerald">{formatMAD(subtotal)}</dd>
                </div>
                <div className="flex justify-between text-emerald/70">
                  <dt>{t(C.delivery)}</dt>
                  <dd>{t(C.byPhone)}</dd>
                </div>
              </dl>
              <div className="mt-6 flex items-baseline justify-between border-t border-emerald/15 pt-6">
                <span className="label text-emerald/70">{t(C.total)}</span>
                <span className="display text-[34px] leading-none">{formatMAD(subtotal)}</span>
              </div>
              <button onClick={() => go('/checkout')} className="label mt-7 w-full bg-emerald py-4 text-ivory transition-colors hover:bg-forest">
                {t(C.checkout)}
              </button>
              <ul className="mt-7 space-y-3 border-t border-emerald/15 pt-6 text-[12px] leading-relaxed text-emerald/60">
                <li className="flex gap-3">
                  <span className="mt-[7px] h-px w-3 shrink-0 bg-brass" />
                  {t(C.cod)}
                </li>
                <li className="flex gap-3">
                  <span className="mt-[7px] h-px w-3 shrink-0 bg-brass" />
                  {t(C.call)}
                </li>
              </ul>
            </div>
          </aside>
        </div>
      )}

      {hasModels && (
        <Suspense fallback={null}>
          <SharedCanvas active />
        </Suspense>
      )}
    </div>
  )
}
