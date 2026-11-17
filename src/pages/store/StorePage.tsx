/**
 * /store — THE COLLECTION, as a store page of its own.
 *  1. Opening banner: page title and a featured piece, live in 3D (turns on hover).
 *  2. Sticky toolbar: category tabs with counts, "in stock" toggle and sorting
 *     (kept in the URL: ?c=qraqeb&sort=price-asc&stock=1).
 *  3. Product grid (2 columns on phones, up to 4 on wide screens): identical 4:5
 *     plates with the live 3D model (or a labelled illustration), badges and a
 *     quick action on hover (Add to cart, or Choose options for pieces with variants).
 *  4. Services band.
 * All 3D previews draw through ONE shared canvas (ShowroomCanvas).
 */
import { lazy, Suspense, useMemo, useRef, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../../lib/api'
import { useAsync } from '../../lib/useAsync'
import { hasWebGL } from '../../lib/device'
import { fromPrice, priceLabel } from '../../lib/price'
import { artFor, isModel, visualFor, NEW_IN, FEATURED_SLUG, type Visual } from '../../data/collection'
import { ProductArt } from '../../components/ProductArt'
import { useTransitionNavigate } from '../../components/Curtain'
import { useCart } from '../../store/cart'
import { StoreState } from './StoreShared'
import { TifinaghField } from '../../components/TifinaghField'
import { useT, type T } from '../../lib/i18n'
import { C, CATEGORY, fill } from '../../lib/copy'
import type { Product } from '../../../shared/schemas'

const SharedCanvas = lazy(() => import('../../sections/showroom/ShowroomScene').then((m) => ({ default: m.ShowroomCanvas })))
const ProductView = lazy(() => import('./CollectionScene').then((m) => ({ default: m.ProductView })))

type Sort = 'featured' | 'price-asc' | 'price-desc' | 'name'
const SORTS: { id: Sort; label: T }[] = [
  { id: 'featured', label: C.featured },
  { id: 'price-asc', label: C.priceAsc },
  { id: 'price-desc', label: C.priceDesc },
  { id: 'name', label: C.nameAz },
]

function Plate({ p, visual, hover, webgl, index }: { p: Product; visual: Visual; hover: React.RefObject<boolean>; webgl: boolean; index: number }) {
  return (
    <div className="relative aspect-[4/5] overflow-hidden bg-[radial-gradient(ellipse_at_50%_30%,#f8f2e6_0%,#ede2cc_55%,#e2d3b6_100%)]">
      <div className="pointer-events-none absolute bottom-[7%] left-1/2 h-[4%] w-[46%] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(closest-side,rgba(74,56,32,.3),transparent)]" />
      {isModel(visual) && webgl ? (
        <Suspense fallback={null}>
          <ProductView visual={visual} hover={hover} index={index} className="absolute inset-0" />
        </Suspense>
      ) : visual.kind === 'photo' && p.image ? (
        <img src={p.image} alt={p.name} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <ProductArt art={artFor(visual)} className="absolute inset-[18%] h-[64%] w-[64%] text-emerald/70" />
      )}
    </div>
  )
}

function Badge({ children, tone }: { children: ReactNode; tone: 'dark' | 'brass' }) {
  return <span className={`label px-2.5 py-1 text-[9px] text-ivory ${tone === 'dark' ? 'bg-emerald' : 'bg-brass'}`}>{children}</span>
}

function ProductCard({ p, index, webgl }: { p: Product; index: number; webgl: boolean }) {
  const t = useT()
  const go = useTransitionNavigate()
  const add = useCart((s) => s.add)
  const hover = useRef(false)
  const [on, setOn] = useState(false)
  const visual = useMemo(() => visualFor(p.slug, p.category, p.image), [p])
  const soldOut = p.stock === 0
  const options = p.variants.length > 1
  const open = () => go(`/store/${p.slug}`, { tone: 'gold', label: p.name })
  const set = (v: boolean) => {
    hover.current = v
    setOn(v)
  }
  return (
    // no transforms on the card: the quick-action button must stay above the shared 3D canvas
    <li className="relative" onPointerEnter={() => set(true)} onPointerLeave={() => set(false)}>
      <a
        href={`/store/${p.slug}`}
        onClick={(e) => {
          e.preventDefault()
          open()
        }}
        onFocus={() => set(true)}
        onBlur={() => set(false)}
        className="block outline-none focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-brass"
        aria-label={`${p.name}, ${priceLabel(p, t(C.from))}`}
      >
        <div className="relative">
          <Plate p={p} visual={visual} hover={hover} webgl={webgl} index={index} />
          <div className={`pointer-events-none absolute inset-0 border transition-colors duration-500 ${on ? 'border-brass/60' : 'border-transparent'}`} />
          <div className="pointer-events-none absolute left-3 top-3 flex flex-col items-start gap-1.5">
            {soldOut ? <Badge tone="dark">{t(C.soldOut)}</Badge> : NEW_IN.has(p.slug) ? <Badge tone="dark">{t(C.new)}</Badge> : null}
            {!soldOut && p.stock <= 3 && <Badge tone="brass">{fill(t(C.onlyLeft), p.stock)}</Badge>}
          </div>
          <span className="label pointer-events-none absolute right-3 top-3 text-[9px] text-emerald/40">{isModel(visual) ? '3D' : visual.kind === 'art' ? t(C.illustration) : ''}</span>
        </div>
        <div className="pt-4">
          <p className="label text-[9px] text-brass">{CATEGORY[p.category] ? t(CATEGORY[p.category]) : p.category}</p>
          <h3 className="display mt-1.5 text-[clamp(18px,1.5vw,22px)] leading-[1.15] text-emerald">{p.name}</h3>
          <p className="mt-1 line-clamp-1 text-[12.5px] font-light text-emerald/55">{p.subtitle}</p>
          <p className="mt-2.5 flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
            <span className="whitespace-nowrap text-[14px] font-medium tracking-wide text-emerald sm:text-[15px]">{priceLabel(p, t(C.from))}</span>
            {options && <span className="text-[11px] text-emerald/45">{p.variants.length} {t(C.options)}</span>}
          </p>
        </div>
      </a>
      {/* quick action over the bottom of the plate (pointer devices only) */}
      <div className="pointer-events-none absolute left-3 right-3 top-0 z-[6] flex aspect-[4/5] items-end pb-3 [@media(hover:none)]:hidden">
        <button
          type="button"
          disabled={soldOut}
          onClick={() => (options ? open() : add(p, p.variants[0]?.id ?? null, 1))}
          tabIndex={on ? 0 : -1}
          className={`label pointer-events-auto w-full py-3 text-[10px] text-ivory transition-all duration-300 ${on ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'} ${
            soldOut ? 'cursor-not-allowed bg-emerald/40' : 'bg-emerald hover:bg-forest'
          }`}
        >
          {t(soldOut ? C.soldOut : options ? C.chooseOptions : C.addToCart)}
        </button>
      </div>
    </li>
  )
}

function Featured({ p, webgl, total }: { p: Product | undefined; webgl: boolean; total: number }) {
  const t = useT()
  const go = useTransitionNavigate()
  const hover = useRef(false)
  const visual = useMemo(() => (p ? visualFor(p.slug, p.category, p.image) : null), [p])
  return (
    <section
      aria-label="Featured"
      className="relative grid overflow-hidden bg-emerald text-ivory md:grid-cols-[1.1fr_1fr]"
      onPointerEnter={() => (hover.current = true)}
      onPointerLeave={() => (hover.current = false)}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_78%_55%,rgba(239,226,196,.16),transparent_60%)]" />
      <TifinaghField preset="showroom" tone="light" opacity={0.06} />
      <div className="relative flex flex-col justify-center px-gutter py-12 md:py-16">
        <p className="label text-sand/80">{t(C.bannerKicker)}{total ? ` · ${total} ${t(C.pieces)}` : ''}</p>
        <h1 className="display mt-5 text-[clamp(44px,6vw,92px)] leading-[0.95]">
          {t(C.title1)} <span className="italic text-beige">{t(C.title2)}</span>
        </h1>
        <p className="mt-5 max-w-[46ch] text-[15px] font-light leading-relaxed text-ivory/70">{t(C.bannerLead)}</p>
        {p && (
          <div className="mt-9 flex max-w-md items-end justify-between gap-6 border-t border-ivory/15 pt-6">
            <div>
              <p className="label text-[10px] text-brass">{t(C.newIn)}</p>
              <p className="display mt-1 text-2xl">{p.name}</p>
              <p className="display mt-1 text-xl text-beige">{priceLabel(p, t(C.from))}</p>
            </div>
            <button onClick={() => go(`/store/${p.slug}`, { tone: 'gold', label: p.name })} className="label shrink-0 bg-beige px-6 py-3.5 text-[10px] text-emerald transition-colors hover:bg-ivory">
              {t(C.discover)}
            </button>
          </div>
        )}
      </div>
      <div className="relative mx-auto aspect-[4/5] w-full max-w-[460px] max-md:max-w-[300px]">
        {p && visual && isModel(visual) && webgl ? (
          <Suspense fallback={null}>
            <ProductView visual={visual} hover={hover} index={1} className="absolute inset-x-0 inset-y-[6%]" />
          </Suspense>
        ) : visual ? (
          <ProductArt art={artFor(visual)} className="absolute inset-[18%] h-[64%] w-[64%] text-beige/60" />
        ) : null}
      </div>
    </section>
  )
}

export default function StorePage() {
  const t = useT()
  const [params, setParams] = useSearchParams()
  const cat = params.get('c') ?? 'all'
  const sort = (params.get('sort') as Sort) ?? 'featured'
  const inStock = params.get('stock') === '1'
  const cats = useAsync(api.categories, [])
  const products = useAsync(() => api.products(), [])
  const webgl = useMemo(hasWebGL, [])

  const all = useMemo(() => products.data ?? [], [products.data])
  const order = useMemo(() => (cats.data ?? []).map((c) => c.slug as string), [cats.data])
  const featured = all.find((p) => p.slug === FEATURED_SLUG) ?? all[0]
  const counts = useMemo(() => {
    const m = new Map<string, number>()
    all.forEach((p) => m.set(p.category, (m.get(p.category) ?? 0) + 1))
    return m
  }, [all])
  const list = useMemo(() => {
    const l = all.filter((p) => (cat === 'all' || p.category === cat) && (!inStock || p.stock > 0))
    if (sort === 'price-asc') l.sort((a, b) => fromPrice(a) - fromPrice(b))
    else if (sort === 'price-desc') l.sort((a, b) => fromPrice(b) - fromPrice(a))
    else if (sort === 'name') l.sort((a, b) => a.name.localeCompare(b.name))
    else l.sort((a, b) => order.indexOf(a.category) - order.indexOf(b.category))
    return l
  }, [all, cat, inStock, sort, order])
  const demo = all.some((p) => p.demo)

  const setParam = (k: string, v: string | null) => {
    const next = new URLSearchParams(params)
    if (v === null) next.delete(k)
    else next.set(k, v)
    setParams(next, { replace: true })
  }
  const tabs = [{ slug: 'all', name: t(C.all), n: all.length }, ...(cats.data ?? []).map((c) => ({ slug: c.slug as string, name: CATEGORY[c.slug] ? t(CATEGORY[c.slug]) : c.name, n: counts.get(c.slug) ?? 0 }))]
  const catName = tabs.find((x) => x.slug === cat)?.name ?? t(C.all)

  return (
    <div data-nav="light" className="min-h-screen bg-[#f4eee2] pt-14 text-emerald sm:pt-[76px]">
      <nav aria-label="Breadcrumb" className="flex items-center gap-3 px-gutter py-4 text-[11px] text-emerald/50">
        <a href="/" className="hover:text-emerald">{t(C.home)}</a>
        <span aria-hidden>/</span>
        <span className="text-emerald">{t(C.collection)}</span>
        {cat !== 'all' && (
          <>
            <span aria-hidden>/</span>
            <span className="text-emerald">{catName}</span>
          </>
        )}
      </nav>

      <Featured p={featured} webgl={webgl} total={all.length} />

      <div className="sticky top-14 z-30 border-b border-emerald/10 bg-[#f4eee2]">
        <div className="flex items-center gap-4 px-gutter">
          <ul className="-ml-1 flex min-w-0 flex-1 gap-1 overflow-x-auto py-3 [scrollbar-width:none]" aria-label="Categories">
            {tabs.map((tb) => (
              <li key={tb.slug}>
                <button
                  onClick={() => setParam('c', tb.slug === 'all' ? null : tb.slug)}
                  aria-pressed={cat === tb.slug}
                  className={`label flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-[10px] transition-colors ${
                    cat === tb.slug ? 'bg-emerald text-ivory' : 'text-emerald/60 hover:bg-emerald/5 hover:text-emerald'
                  }`}
                >
                  {tb.name}
                  {products.data && <span className={`tracking-normal ${cat === tb.slug ? 'text-ivory/60' : 'text-emerald/35'}`}>{tb.n}</span>}
                </button>
              </li>
            ))}
          </ul>
          <label className="hidden shrink-0 cursor-pointer items-center gap-2.5 text-[12px] text-emerald/70 md:flex">
            <input type="checkbox" checked={inStock} onChange={(e) => setParam('stock', e.target.checked ? '1' : null)} className="h-3.5 w-3.5 accent-[#15382b]" />
            {t(C.inStock)}
          </label>
          <label className="relative shrink-0">
            <span className="sr-only">{t(C.sortBy)}</span>
            <select
              value={sort}
              onChange={(e) => setParam('sort', e.target.value === 'featured' ? null : e.target.value)}
              className="label cursor-pointer appearance-none border border-emerald/20 bg-transparent py-2 pl-3 pr-8 text-[10px] text-emerald outline-none hover:border-emerald/50 max-sm:w-[112px] max-sm:truncate"
            >
              {SORTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {t(s.label)}
                </option>
              ))}
            </select>
            <span aria-hidden className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-emerald/60">▾</span>
          </label>
        </div>
      </div>

      <div className="px-gutter pb-20 pt-8">
        <div className="mb-7 flex items-baseline justify-between gap-4">
          <h2 className="display text-[clamp(26px,2.6vw,38px)] leading-none">{cat === 'all' ? t(C.allPieces) : catName}</h2>
          {products.data && <p className="text-[12px] text-emerald/50">{list.length} {t(list.length === 1 ? C.piece : C.pieces)}</p>}
        </div>
        <StoreState tone="light" loading={products.loading || cats.loading} error={products.error ?? cats.error} retry={() => (products.retry(), cats.retry())}>
          {list.length === 0 ? (
            <div className="flex flex-col items-center gap-5 py-24 text-center">
              <p className="display text-3xl">{t(C.nothing)}</p>
              <button onClick={() => setParams({}, { replace: true })} className="label border border-emerald/30 px-6 py-3 text-[10px] hover:border-emerald">
                {t(C.showAll)}
              </button>
            </div>
          ) : (
            <ul className="grid grid-cols-2 gap-x-[clamp(12px,2vw,28px)] gap-y-12 lg:grid-cols-3 xl:grid-cols-4">
              {list.map((p, i) => (
                <ProductCard key={p.id} p={p} index={i} webgl={webgl} />
              ))}
            </ul>
          )}
        </StoreState>
        {demo && <p className="mt-14 max-w-[70ch] text-[11.5px] leading-relaxed text-emerald/45">{t(C.demoNote)}</p>}
      </div>

      <section aria-label="How buying works" className="grid gap-px border-t border-emerald/10 bg-emerald/10 sm:grid-cols-2 lg:grid-cols-4">
        {C.services.map(([ti, d]) => (
          <div key={ti.en} className="bg-[#ece3d1] px-gutter py-10 sm:px-8">
            <span className="block h-px w-8 bg-brass" />
            <p className="display mt-5 text-[22px] leading-tight">{t(ti)}</p>
            <p className="mt-2 max-w-[32ch] text-[13px] leading-relaxed text-emerald/60">{t(d)}</p>
          </div>
        ))}
      </section>

      {webgl && all.length > 0 && (
        <Suspense fallback={null}>
          <SharedCanvas active />
        </Suspense>
      )}
    </div>
  )
}
