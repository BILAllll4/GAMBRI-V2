/**
 * Responsive photograph: AVIF → WebP sources with srcset, a blurred inline
 * placeholder while it loads, and object-position from the photo's focus.
 */
import { useCallback, useState, type CSSProperties } from 'react'
import { PHOTOS, photoMeta, type PhotoKey, type Credit } from '../../data/media'

const srcset = (k: PhotoKey, ext: 'avif' | 'webp') =>
  photoMeta(k)
    .widths.map((w) => `/images/photos/${k}-${w}.${ext} ${w}w`)
    .join(', ')

export function Photo({
  k,
  sizes = '100vw',
  className = '',
  imgClassName = '',
  eager = false,
  style,
}: {
  k: PhotoKey
  sizes?: string
  className?: string
  imgClassName?: string
  eager?: boolean
  style?: CSSProperties
}) {
  const meta = photoMeta(k)
  const p = PHOTOS[k]
  const [loaded, setLoaded] = useState(false)
  const largest = meta.widths[meta.widths.length - 1]
  // an image already in the cache can finish before React listens for "load"
  const ref = useCallback((img: HTMLImageElement | null) => {
    if (img?.complete && img.naturalWidth) setLoaded(true)
  }, [])
  return (
    <picture className={`block h-full w-full ${className}`} style={style}>
      <source type="image/avif" srcSet={srcset(k, 'avif')} sizes={sizes} />
      <source type="image/webp" srcSet={srcset(k, 'webp')} sizes={sizes} />
      <img
        ref={ref}
        src={`/images/photos/${k}-${largest}.webp`}
        alt={p.alt}
        width={meta.w}
        height={meta.h}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={eager ? 'high' : 'auto'}
        onLoad={() => setLoaded(true)}
        className={`h-full w-full object-cover transition-[filter,opacity] duration-1000 ${loaded ? '' : 'blur-xl'} ${imgClassName}`}
        style={{
          objectPosition: p.focus ?? '50% 50%',
          backgroundImage: loaded ? undefined : `url(${meta.lqip})`,
          backgroundSize: 'cover',
        }}
      />
    </picture>
  )
}

/** "Caption — Author, Licence" with links to the source page and licence */
export function CreditLine({ credit, caption, className = '' }: { credit: Credit; caption?: string; className?: string }) {
  return (
    <span className={`credit ${className}`}>
      {caption && <>{caption} · </>}
      Photo{' '}
      <a href={credit.source} target="_blank" rel="noopener noreferrer">
        {credit.author}
      </a>
      ,{' '}
      <a href={credit.licenseUrl} target="_blank" rel="noopener noreferrer">
        {credit.license}
      </a>
    </span>
  )
}
