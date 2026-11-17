import type { SVGProps } from 'react'
/** Moroccan-inspired graphic elements, drawn as clean line-work. */

/** khatam — the eight-pointed star made of two overlapping squares */
export function Khatam({ className = '', strokeWidth = 1, ...rest }: { className?: string; strokeWidth?: number } & Omit<SVGProps<SVGSVGElement>, 'strokeWidth'> & Record<`data-${string}`, string>) {
  return (
    <svg {...rest} viewBox="0 0 100 100" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth={strokeWidth} vectorEffect="non-scaling-stroke">
      <rect x="20" y="20" width="60" height="60" />
      <rect x="20" y="20" width="60" height="60" transform="rotate(45 50 50)" />
      <circle cx="50" cy="50" r="13" />
      <circle cx="50" cy="50" r="4" />
    </svg>
  )
}

/** horseshoe arch outline */
export function ArchOutline({ className = '', strokeWidth = 1, ...rest }: { className?: string; strokeWidth?: number } & Omit<SVGProps<SVGSVGElement>, 'strokeWidth'> & Record<`data-${string}`, string>) {
  // circle continues below the spring line, then the jambs drop to the base
  const r = 40
  const cx = 50
  const cy = 52
  const a = 0.5
  const x0 = cx - r * Math.cos(a)
  const x1 = cx + r * Math.cos(a)
  const y = cy + r * Math.sin(a)
  return (
    <svg {...rest} viewBox="0 0 100 140" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth={strokeWidth}>
      <path d={`M ${x0} 140 L ${x0} ${y} A ${r} ${r} 0 1 1 ${x1} ${y} L ${x1} 140`} vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

/** soft organic blob, used as a drifting shape in the editorial page */
export function Blob({ className = '', variant = 0, ...rest }: { className?: string; variant?: 0 | 1 | 2 } & SVGProps<SVGSVGElement> & Record<`data-${string}`, string>) {
  const paths = [
    'M421,310Q388,370,333,404Q278,438,207,428Q136,418,96,357Q56,296,74,227Q92,158,148,113Q204,68,276,79Q348,90,401,145Q454,200,421,310Z',
    'M437,297Q404,344,368,393Q332,442,262,446Q192,450,139,405Q86,360,73,289Q60,218,110,165Q160,112,230,80Q300,48,352,103Q404,158,437,229Q470,250,437,297Z',
    'M402,318Q395,386,327,410Q259,434,194,418Q129,402,87,341Q45,280,75,213Q105,146,166,104Q227,62,297,86Q367,110,388,180Q409,250,402,318Z',
  ]
  return (
    <svg {...rest} viewBox="0 0 500 500" className={className} aria-hidden>
      <path d={paths[variant]} fill="currentColor" />
    </svg>
  )
}

/** chevron/zigzag band reminiscent of carved plaster borders */
export function ZigzagBand({ className = '' }: { className?: string }) {
  return (
    <svg className={className} aria-hidden preserveAspectRatio="none" viewBox="0 0 240 12">
      <path d={Array.from({ length: 21 }, (_, i) => `${i === 0 ? 'M' : 'L'} ${i * 12} ${i % 2 ? 2 : 10}`).join(' ')} fill="none" stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}
