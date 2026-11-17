export function QtyStepper({
  value,
  max,
  onChange,
  small = false,
  tone = 'dark',
}: {
  value: number
  max: number
  onChange: (n: number) => void
  small?: boolean
  /** light = emerald on the ivory pages (cart) */
  tone?: 'dark' | 'light'
}) {
  const h = small ? 'h-8 w-8' : 'h-11 w-11'
  const c = tone === 'light' ? { box: 'border-emerald/20', btn: 'text-emerald/60 hover:text-emerald', val: 'text-emerald' } : { box: 'border-ivory/20', btn: 'text-ivory/70 hover:text-ivory', val: 'text-ivory' }
  return (
    <div className={`inline-flex items-center border ${c.box}`} role="group" aria-label="Quantity">
      <button type="button" className={`${h} grid place-items-center ${c.btn} disabled:opacity-30`} onClick={() => onChange(value - 1)} disabled={value <= 1} aria-label="Decrease quantity">
        −
      </button>
      <span className={`${small ? 'w-7 text-[13px]' : 'w-10 text-sm'} text-center ${c.val}`} aria-live="polite">
        {value}
      </span>
      <button type="button" className={`${h} grid place-items-center ${c.btn} disabled:opacity-30`} onClick={() => onChange(value + 1)} disabled={value >= max} aria-label="Increase quantity">
        +
      </button>
    </div>
  )
}
