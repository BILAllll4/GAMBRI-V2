/**
 * Language switch in the header: the current language, opening a small list
 * of English, Français and العربية. The choice persists (lib/i18n) and sets
 * <html lang dir>, so Arabic reads right to left.
 */
import { useEffect, useRef, useState } from 'react'
import { LANGS, useLang } from '../lib/i18n'

export function LangSwitch({ light }: { light: boolean }) {
  const { lang, setLang } = useLang()
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const current = LANGS.find((l) => l.id === lang)!

  useEffect(() => {
    if (!open) return
    const close = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false)
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('pointerdown', close)
    window.addEventListener('keydown', esc)
    return () => {
      window.removeEventListener('pointerdown', close)
      window.removeEventListener('keydown', esc)
    }
  }, [open])

  return (
    <div ref={root} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Language: ${current.name}`}
        className={`label flex h-8 items-center gap-1.5 rounded-full border px-3 text-[10px] transition-colors ${
          light ? 'border-emerald/25 hover:border-emerald/60' : 'border-ivory/30 hover:border-ivory/70'
        }`}
      >
        {current.label}
        <span aria-hidden className={`text-[8px] transition-transform ${open ? 'rotate-180' : ''}`}>
          ▾
        </span>
      </button>
      {open && (
        <ul role="listbox" aria-label="Language" className="absolute top-10 z-[90] min-w-[150px] border border-emerald/10 bg-[#fbf8f2] p-1 text-emerald shadow-[0_16px_40px_-20px_rgba(21,56,43,.45)] ltr:right-0 rtl:left-0">
          {LANGS.map((l) => (
            <li key={l.id}>
              <button
                role="option"
                aria-selected={l.id === lang}
                onClick={() => {
                  setLang(l.id)
                  setOpen(false)
                }}
                className={`flex w-full items-center justify-between gap-4 px-3 py-2 text-start text-[13px] transition-colors ${l.id === lang ? 'bg-emerald text-ivory' : 'hover:bg-emerald/5'}`}
              >
                <span lang={l.id}>{l.name}</span>
                <span className="label text-[9px] opacity-60">{l.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
