/**
 * Site language: English, French or Arabic (right-to-left). The choice is
 * remembered in localStorage and applied to <html lang dir>.
 */
import { useEffect } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Lang = 'en' | 'fr' | 'ar'
export type T = Record<Lang, string>
export const LANGS: { id: Lang; label: string; name: string }[] = [
  { id: 'en', label: 'EN', name: 'English' },
  { id: 'fr', label: 'FR', name: 'Français' },
  { id: 'ar', label: 'ع', name: 'العربية' },
]

export const useLang = create<{ lang: Lang; setLang: (l: Lang) => void }>()(
  persist((set) => ({ lang: 'en', setLang: (lang) => set({ lang }) }), { name: 'gnawa-lang', version: 1 }),
)

/** pick the current language's string */
export function useT() {
  const lang = useLang((s) => s.lang)
  return (x: T) => x[lang] ?? x.en
}

/** keeps <html lang> and <html dir> in step with the chosen language */
export function useDocumentLang() {
  const lang = useLang((s) => s.lang)
  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
  }, [lang])
}
