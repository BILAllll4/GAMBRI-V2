/**
 * Line illustrations for products that have no photograph or 3D model yet.
 * Drawn in one consistent hand (thin emerald line-work on the beige plate) so
 * the collection reads as one set; they are labelled as illustrations on the
 * card, never passed off as product photography.
 */
import type { ArtId } from '../data/collection'

const common = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.4,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  vectorEffect: 'non-scaling-stroke' as const,
}

function Coil({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  // a coiled gut string: concentric loops with the free end trailing away
  return (
    <g>
      {[0, 1, 2, 3].map((i) => (
        <ellipse key={i} cx={cx + i * 0.6} cy={cy - i * 0.4} rx={r - i * 2.2} ry={(r - i * 2.2) * 0.92} {...common} />
      ))}
      <path d={`M ${cx + r * 0.7} ${cy + r * 0.7} q 12 14 28 10 t 22 16`} {...common} />
    </g>
  )
}

const ART: Record<ArtId, React.ReactNode> = {
  strings: (
    <g>
      <Coil cx={70} cy={92} r={30} />
      <Coil cx={130} cy={86} r={26} />
      <Coil cx={100} cy={146} r={28} />
    </g>
  ),
  bindings: (
    <g>
      {/* a section of neck with leather wrapped round it, and two loose straps */}
      <rect x={88} y={30} width={24} height={150} rx={12} {...common} />
      {[64, 74, 84, 128, 138, 148].map((y) => (
        <path key={y} d={`M 86 ${y} q 14 6 28 0`} {...common} />
      ))}
      <path d="M 114 74 q 30 10 26 40 q -4 26 18 40" {...common} />
      <path d="M 86 138 q -28 6 -30 26 q -2 18 -20 22" {...common} />
      <path d="M 120 76 q 30 10 26 40 q -4 26 18 40" {...common} strokeWidth={0.8} />
    </g>
  ),
  bag: (
    <g>
      {/* padded case shaped to the instrument: wide body, long neck */}
      <path d="M 70 182 q -18 0 -18 -22 v -46 q 0 -20 20 -24 l 18 -4 v -60 q 0 -10 10 -10 q 10 0 10 10 v 60 l 18 4 q 20 4 20 24 v 46 q 0 22 -18 22 z" {...common} />
      <path d="M 66 120 h 68 M 66 150 h 68" {...common} strokeWidth={0.8} strokeDasharray="3 4" />
      <path d="M 60 104 q -26 30 -6 70" {...common} />
      <rect x={92} y={100} width={16} height={8} rx={2} {...common} />
    </g>
  ),
  cap: (
    <g>
      {/* rounded cap with rows of cowrie shells */}
      <path d="M 46 132 q 0 -66 54 -66 q 54 0 54 66 z" {...common} />
      <path d="M 44 132 h 112 v 10 h -112 z" {...common} />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => {
        const a = Math.PI * (0.16 + i * 0.113)
        const x = 100 - Math.cos(a) * 40
        const y = 128 - Math.sin(a) * 42
        return <ellipse key={i} cx={x} cy={y} rx={4.2} ry={6.5} transform={`rotate(${(a * 180) / Math.PI - 90} ${x} ${y})`} {...common} />
      })}
      {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <ellipse key={`b${i}`} cx={54 + i * 11.5} cy={137} rx={3.4} ry={2.4} {...common} />
      ))}
      <path d="M 100 66 v -8" {...common} />
    </g>
  ),
  tunic: (
    <g>
      {/* loose linen tunic laid flat */}
      <path d="M 82 36 q 18 12 36 0 l 40 14 l 22 44 l -22 10 l -12 -22 v 104 h -84 v -104 l -12 22 l -22 -10 l 22 -44 z" {...common} />
      <path d="M 82 36 q 18 30 36 0" {...common} />
      <path d="M 100 52 v 40" {...common} strokeWidth={0.8} />
      <path d="M 70 170 h 60" {...common} strokeWidth={0.8} strokeDasharray="2 4" />
    </g>
  ),
  qraqeb: (
    <g>
      <circle cx={100} cy={64} r={24} {...common} />
      <circle cx={100} cy={146} r={24} {...common} />
      <path d="M 94 88 q 6 14 0 34 M 106 88 q -6 14 0 34" {...common} />
    </g>
  ),
  guembri: (
    <g>
      <path d="M 100 20 v 100" {...common} />
      <rect x={76} y={118} width={48} height={70} rx={20} {...common} />
    </g>
  ),
  khatam: (
    <g>
      <rect x={66} y={66} width={68} height={68} {...common} />
      <rect x={66} y={66} width={68} height={68} transform="rotate(45 100 100)" {...common} />
      <circle cx={100} cy={100} r={14} {...common} />
    </g>
  ),
}

export function ProductArt({ art, className = '' }: { art: ArtId; className?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden>
      {ART[art]}
    </svg>
  )
}
