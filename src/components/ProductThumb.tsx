import { useState } from 'react'
import { Khatam } from './Ornaments'

/** product image, or a typographic placeholder that says the photo is still to come */
export function ProductThumb({ image, name, className = '', large = false }: { image: string | null; name: string; className?: string; large?: boolean }) {
  const [failed, setFailed] = useState(false)
  if (image && !failed) {
    return (
      <div className={`overflow-hidden bg-forest ${className}`}>
        <img src={image} alt={name} loading="lazy" decoding="async" onError={() => setFailed(true)} className="h-full w-full object-cover" />
      </div>
    )
  }
  return (
    <div className={`relative flex flex-col items-center justify-center gap-3 overflow-hidden bg-forest text-beige/45 ${className}`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(177,138,82,.18),transparent_65%)]" />
      <Khatam className={large ? 'h-20 w-20' : 'h-8 w-8'} />
      {large && (
        <>
          <p className="display relative max-w-[16ch] text-center text-2xl text-beige/70">{name}</p>
          <p className="label relative">Product photograph to be supplied</p>
        </>
      )}
    </div>
  )
}
