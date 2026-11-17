import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api, formatMAD } from '../../lib/api'
import { useAsync } from '../../lib/useAsync'
import { hasWebGL } from '../../lib/device'
import { useCart, MAX_PER_LINE } from '../../store/cart'
import { ProductThumb } from '../../components/ProductThumb'
import { QtyStepper } from '../../components/QtyStepper'
import { useTransitionNavigate } from '../../components/Curtain'
import { DemoNotice, StoreState } from './StoreShared'
import { Reviews } from './Reviews'
import type { ViewerModel } from '../../three/ProductViewer'
import type { Product } from '../../../shared/schemas'
import { useT } from '../../lib/i18n'
import { CATEGORY } from '../../lib/copy'
import { visualFor } from '../../data/collection'

const ProductViewer = lazy(() => import('../../three/ProductViewer'))

function viewerModelFor(p: Product, variantName: string | null): ViewerModel | null {
  if (p.model === 'guembri') {
    // the finish shown in the collection (data/collection.ts), unless the chosen variant is the dark-stained one
    const v = visualFor(p.slug, p.category, p.image)
    const base = v.kind === 'guembri' ? v.finish : 'natural'
    return { kind: 'guembri', finish: variantName?.toLowerCase().includes('dark') ? 'dark' : base }
  }
  if (p.model === 'qraqeb') return { kind: 'qraqeb', pairs: variantName?.toLowerCase().includes('two') ? 2 : 1 }
  return null
}

function ProductDetail({ p }: { p: Product }) {
  const t = useT()
  const add = useCart((s) => s.add)
  const go = useTransitionNavigate()
  const [variantId, setVariantId] = useState<number | null>(() => p.variants.find((v) => v.stock > 0)?.id ?? p.variants[0]?.id ?? null)
  const [qty, setQty] = useState(1)
  const [mode, setMode] = useState<'3d' | 'photo'>(p.model && hasWebGL() ? '3d' : 'photo')
  const [resetNonce, setResetNonce] = useState(0)
  const [added, setAdded] = useState(false)

  const variant = p.variants.find((v) => v.id === variantId) ?? null
  const price = p.price + (variant?.priceDelta ?? 0)
  const stock = variant ? variant.stock : p.stock
  const maxQty = Math.min(MAX_PER_LINE, stock)
  const model = useMemo(() => viewerModelFor(p, variant?.name ?? null), [p, variant])

  useEffect(() => setQty((q) => Math.max(1, Math.min(q, maxQty || 1))), [maxQty])

  const onAdd = () => {
    add(p, variantId, qty)
    setAdded(true)
    window.setTimeout(() => setAdded(false), 2200)
  }

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-16">
      {/* media */}
      <div className="lg:sticky lg:top-24 lg:col-span-7 lg:self-start">
        <div className="relative aspect-[4/3] overflow-hidden bg-[radial-gradient(circle_at_50%_40%,#2f4a38_0%,#17251c_75%)]">
          {mode === '3d' && model ? (
            <Suspense fallback={<div className="grid h-full place-items-center text-[12px] text-beige/50">{t({ en: 'Loading 3D view…', fr: 'Chargement de la vue 3D…', ar: 'جارٍ تحميل العرض ثلاثي الأبعاد…' })}</div>}>
              <ProductViewer model={model} resetNonce={resetNonce} />
            </Suspense>
          ) : (
            <ProductThumb image={p.image} name={p.name} large className="h-full w-full" />
          )}
          {mode === '3d' && model && <p className="label pointer-events-none absolute bottom-4 left-4 text-beige/50">{t({ en: 'Drag to rotate · scroll to zoom', fr: 'Glisser pour tourner · molette pour zoomer', ar: 'اسحب للتدوير · استعمل العجلة للتكبير' })}</p>}
        </div>
        {p.model && (
          <div className="mt-3 flex items-center gap-4">
            {hasWebGL() && (
              <button onClick={() => setMode('3d')} aria-pressed={mode === '3d'} className={`label ${mode === '3d' ? 'text-gold' : 'text-ivory/55 hover:text-ivory'}`}>
                {t({ en: '3D view', fr: 'Vue 3D', ar: 'عرض ثلاثي الأبعاد' })}
              </button>
            )}
            <button onClick={() => setMode('photo')} aria-pressed={mode === 'photo'} className={`label ${mode === 'photo' ? 'text-gold' : 'text-ivory/55 hover:text-ivory'}`}>
              {t({ en: 'Image', fr: 'Image', ar: 'صورة' })}
            </button>
            {mode === '3d' && (
              <button onClick={() => setResetNonce((n) => n + 1)} className="label ml-auto text-ivory/55 hover:text-ivory">
                {t({ en: 'Reset view', fr: 'Réinitialiser la vue', ar: 'إعادة العرض' })}
              </button>
            )}
          </div>
        )}
        <p className="mt-2 text-[11px] text-ivory/35">
          {p.model
            ? t({ en: 'The 3D model and image are renders of this site’s own 3D model, not the actual product.', fr: 'Le modèle 3D et l’image sont des rendus du modèle 3D de ce site, pas du produit réel.', ar: 'النموذج ثلاثي الأبعاد والصورة عروض لنموذج هذا الموقع، وليست للمنتج الفعلي.' })
            : t({ en: 'Product photography to be supplied.', fr: 'Photographies du produit à fournir.', ar: 'صور المنتج ستُضاف لاحقًا.' })}
        </p>
      </div>

      {/* details */}
      <div className="lg:col-span-5">
        <p className="label text-gold">{CATEGORY[p.category] ? t(CATEGORY[p.category]) : p.category}</p>
        <h1 className="display mt-4 text-5xl leading-[0.95] text-ivory sm:text-6xl">{p.name}</h1>
        <p className="mt-3 text-[14px] text-ivory/60">{p.subtitle}</p>
        <p className="display mt-8 text-4xl text-ivory">{formatMAD(price)}</p>

        {p.variants.length > 0 && (
          <fieldset className="mt-10">
            <legend className="label text-ivory/60">{t({ en: 'Option', fr: 'Option', ar: 'الخيار' })}</legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {p.variants.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setVariantId(v.id)}
                  disabled={v.stock === 0}
                  aria-pressed={v.id === variantId}
                  className={`px-4 py-3 text-[13px] transition-colors disabled:cursor-not-allowed disabled:line-through disabled:opacity-35 ${
                    v.id === variantId ? 'bg-ivory text-olive' : 'border border-ivory/20 text-ivory/80 hover:border-ivory/50'
                  }`}
                >
                  {v.name}
                  {v.priceDelta > 0 && <span className="ml-2 opacity-60">+{formatMAD(v.priceDelta)}</span>}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        <p className={`mt-6 text-[13px] ${stock === 0 ? 'text-[#d99a80]' : stock <= 3 ? 'text-gold' : 'text-sage'}`} aria-live="polite">
          {stock === 0
            ? t({ en: 'Out of stock', fr: 'Rupture de stock', ar: 'غير متوفّر' })
            : stock <= 3
              ? t({ en: `Only ${stock} left`, fr: `Plus que ${stock}`, ar: `بقي ${stock} فقط` })
              : t({ en: 'In stock', fr: 'En stock', ar: 'متوفّر' })}
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-4">
          <QtyStepper value={qty} max={Math.max(1, maxQty)} onChange={setQty} />
          <button onClick={onAdd} disabled={stock === 0} className="label flex-1 bg-gold px-8 py-4 text-olive transition-colors hover:bg-[#c39a5e] disabled:cursor-not-allowed disabled:opacity-40">
            {added ? t({ en: 'Added ✓', fr: 'Ajouté ✓', ar: 'أُضيف ✓' }) : t({ en: 'Add to cart', fr: 'Ajouter au panier', ar: 'أضف إلى السلة' })}
          </button>
        </div>
        {added && (
          <button onClick={() => go('/checkout')} className="label mt-4 text-ivory/70 underline-offset-4 hover:underline">
            {t({ en: 'Go to checkout', fr: 'Passer la commande', ar: 'إتمام الطلب' })} <span className="inline-block rtl:-scale-x-100">→</span>
          </button>
        )}

        <p className="mt-12 text-[15px] leading-relaxed text-ivory/75">{p.description}</p>

        <dl className="mt-10 divide-y divide-ivory/10 border-y border-ivory/10">
          {p.specs.map((s) => (
            <div key={s.label} className="grid grid-cols-[9rem_1fr] gap-4 py-3 text-[13px]">
              <dt className="text-ivory/50">{s.label}</dt>
              <dd className={s.value.startsWith('To be confirmed') ? 'italic text-ivory/40' : 'text-ivory/85'}>{s.value}</dd>
            </div>
          ))}
        </dl>
        <ul className="mt-8 space-y-2 text-[12px] text-ivory/50">
          <li>· {t({ en: 'Cash on delivery across Morocco', fr: 'Paiement à la livraison partout au Maroc', ar: 'الدفع عند الاستلام في كل المغرب' })}</li>
          <li>· {t({ en: 'Delivery cost confirmed by phone before dispatch', fr: 'Frais de livraison confirmés par téléphone avant l’envoi', ar: 'تُؤكَّد تكلفة التوصيل بالهاتف قبل الإرسال' })}</li>
        </ul>
        {p.demo && <DemoNotice className="mt-10" />}
      </div>
    </div>
  )
}

export default function ProductPage() {
  const t = useT()
  const { slug = '' } = useParams()
  const go = useTransitionNavigate()
  const { data, loading, error, retry } = useAsync(() => api.product(slug), [slug])
  return (
    <div className="min-h-screen bg-olive px-4 pb-24 pt-28 sm:px-8 sm:pt-32">
      <button onClick={() => go('/store')} className="label mb-10 text-ivory/55 hover:text-ivory">
        <span className="inline-block rtl:-scale-x-100">←</span> {t({ en: 'The collection', fr: 'La collection', ar: 'المجموعة' })}
      </button>
      <StoreState loading={loading} error={error} retry={retry}>
        {data && (
          <>
            <ProductDetail key={data.id} p={data} />
            <Reviews key={`r-${data.slug}`} slug={data.slug} />
          </>
        )}
      </StoreState>
    </div>
  )
}
