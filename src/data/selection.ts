/**
 * The three guembris of the selection scene.
 *
 * The project has ONE 3D guembri (public/models/guembri.glb). The three choices
 * are that same model in three finishes from the catalogue (src/three/Guembri.tsx
 * FINISHES) — not three different instruments. Their names and prices follow the
 * demo catalogue (server/seed.ts); everything is demonstration data.
 */
import type { GuembriFinish } from '../three/Guembri'
import type { T } from '../lib/i18n'

export interface GuembriOption {
  id: string
  slug: string // product in the store
  finish: GuembriFinish
  name: T
  line: T
  details: { label: T; value: T }[]
}

const SKIN = { label: { en: 'Soundboard', fr: 'Table', ar: 'سطح الصوت' }, value: { en: 'Camel skin', fr: 'Peau de dromadaire', ar: 'جلد الجمل' } }
const STRINGS = { label: { en: 'Strings', fr: 'Cordes', ar: 'الأوتار' }, value: { en: 'Three, gut', fr: 'Trois, en boyau', ar: 'ثلاثة، من المصران' } }

export const OPTIONS: GuembriOption[] = [
  {
    id: 'traditional',
    slug: 'guembri-traditional',
    finish: 'traditional',
    name: { en: 'Traditional', fr: 'Traditionnel', ar: 'التقليدي' },
    line: {
      en: 'Honey-gold oiled wood, full size, built the classic way.',
      fr: 'Bois huilé couleur miel doré, pleine taille, construit à l’ancienne.',
      ar: 'خشب مزيّت بلون ذهبي عسلي، بالحجم الكامل وعلى الطريقة الأصيلة.',
    },
    details: [{ label: { en: 'Finish', fr: 'Finition', ar: 'التشطيب' }, value: { en: 'Oiled', fr: 'Huilée', ar: 'مزيّت' } }, SKIN, STRINGS],
  },
  {
    id: 'workshop',
    slug: 'guembri-workshop-edition',
    finish: 'dark',
    name: { en: 'Workshop Edition', fr: 'Édition Atelier', ar: 'نسخة الورشة' },
    line: {
      en: 'A carved body in dark-stained wood under a pale skin.',
      fr: 'Une caisse sculptée en bois teinté foncé sous une peau claire.',
      ar: 'صندوق منحوت من خشب مصبوغ داكن تحت جلد فاتح.',
    },
    details: [{ label: { en: 'Finish', fr: 'Finition', ar: 'التشطيب' }, value: { en: 'Dark-stained', fr: 'Teinté foncé', ar: 'مصبوغ داكن' } }, SKIN, STRINGS],
  },
  {
    id: 'premium',
    slug: 'guembri-premium-walnut',
    finish: 'premium',
    name: { en: 'Premium Walnut', fr: 'Noyer Premium', ar: 'الجوز الفاخر' },
    line: {
      en: 'A deep walnut tone with a selected, warmer skin.',
      fr: 'Un ton noyer profond avec une peau choisie, plus chaude.',
      ar: 'لون جوز عميق مع جلد مختار أدفأ.',
    },
    details: [{ label: { en: 'Finish', fr: 'Finition', ar: 'التشطيب' }, value: { en: 'Walnut tone', fr: 'Ton noyer', ar: 'لون الجوز' } }, SKIN, STRINGS],
  },
]
