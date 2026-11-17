/** the GNAWA mark: an eight-pointed star (khatam) in brass and the word in spaced capitals; text takes currentColor */
export function Logo({ className = '', compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={`flex items-center gap-3 ${className}`}>
      <svg width={compact ? 18 : 20} height={compact ? 18 : 20} viewBox="0 0 24 24" aria-hidden className="text-brass transition-[width,height] duration-500">
        <g fill="none" stroke="currentColor" strokeWidth="1">
          <rect x="5" y="5" width="14" height="14" />
          <rect x="5" y="5" width="14" height="14" transform="rotate(45 12 12)" />
          <circle cx="12" cy="12" r="2.4" />
        </g>
      </svg>
      <span dir="ltr" className={`font-display leading-none tracking-[0.34em] transition-[font-size] duration-500 ${compact ? 'text-[18px]' : 'text-[20px] sm:text-[21px]'}`}>GNAWA</span>
    </span>
  )
}
