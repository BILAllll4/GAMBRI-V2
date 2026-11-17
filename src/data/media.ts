/**
 * Every photograph in the experience, with its source and licence.
 *
 * All images are real photographs from Wikimedia Commons, published under the
 * licences listed below. Files were only resized and re-encoded (AVIF/WebP) by
 * scripts/optimize-photos.mjs; colour grading is applied in CSS on top, so the
 * files themselves are unmodified. Captions describe only what the source
 * page states.
 */
import photos from './photos.json'

export type PhotoKey = keyof typeof photos

export interface Credit {
  author: string
  license: string
  licenseUrl: string
  source: string // Commons file page
}

export interface Photo {
  key: PhotoKey
  alt: string
  caption: string
  credit: Credit
  /** focal point for object-position, e.g. '50% 30%' */
  focus?: string
}

const BY2 = ['CC BY 2.0', 'https://creativecommons.org/licenses/by/2.0/'] as const
const BY3 = ['CC BY 3.0', 'https://creativecommons.org/licenses/by/3.0/'] as const
const BYSA3NL = ['CC BY-SA 3.0 NL', 'https://creativecommons.org/licenses/by-sa/3.0/nl/'] as const
const BYSA4 = ['CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0/'] as const

const commons = (file: string) => `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(file.replace(/ /g, '_'))}`
const credit = (author: string, [license, licenseUrl]: readonly [string, string], file: string): Credit => ({
  author,
  license,
  licenseUrl,
  source: commons(file),
})

export const PHOTOS: Record<PhotoKey, Photo> = {
  fire: {
    key: 'fire',
    alt: 'Two silhouetted figures at night beside a fire, a drum held toward the flames',
    caption: 'Preparing for the Gnaoua music night',
    credit: credit('Houssain Tork', BYSA4, 'Preparing for the Gnaoua music party.jpg'),
    focus: '55% 50%',
  },
  bekkas: {
    key: 'bekkas',
    alt: 'Maâlem Majid Bekkas on stage, holding the neck of his guembri',
    caption: 'Majid Bekkas and his guembri',
    credit: credit('Octagon', BY3, 'Majid Bekkas.jpg'),
    focus: '45% 35%',
  },
  marrakech: {
    key: 'marrakech',
    alt: 'A musician in a red robe and embroidered cap plays a guembri against an ochre wall',
    caption: 'Guembri player, Marrakech',
    credit: credit('Ahron de Leeuw', BY2, 'Guimbri player, Marrakech.jpg'),
    focus: '50% 55%',
  },
  rabat: {
    key: 'rabat',
    alt: 'A seated musician plays the sintir in front of a blue wall',
    caption: 'Sintir player in Rabat',
    credit: credit('Lars Curfs', BYSA3NL, 'Sintir player in Rabat, Morocco.JPG'),
    focus: '50% 45%',
  },
  tbel: {
    key: 'tbel',
    alt: 'A Gnawa musician in a green satin robe carries a painted tbel drum in a doorway',
    caption: 'Gnawa musician with the tbel',
    credit: credit('Brahim Faraji', BYSA4, 'Gnawa in the door by Brahim FARAJI.jpg'),
    focus: '50% 40%',
  },
  qraqeb: {
    key: 'qraqeb',
    alt: 'A Gnawa singer in a blue embroidered robe and cowrie cap holds two pairs of qraqeb',
    caption: 'Qraqeb — the iron castanets',
    credit: credit('Houssain Tork', BYSA4, 'Gnawa the rhythms of heritage.jpg'),
    focus: '50% 30%',
  },
  stage: {
    key: 'stage',
    alt: 'A young Gnawa performer on stage raising qraqeb under a spotlight',
    caption: 'A performance of Gnawa music in Morocco',
    credit: credit('Houssain Tork', BYSA4, 'A performance of Gnawa music in Morocco.jpg'),
    focus: '50% 30%',
  },
  essaouira: {
    key: 'essaouira',
    alt: 'Gnawa dancers in red and blue robes turning in a street of the medina of Essaouira',
    caption: 'In the medina of Essaouira',
    credit: credit('Elmehdi Alem', BYSA4, 'The Gnawa in the medina of essaouira.jpg'),
    focus: '50% 45%',
  },
  museum: {
    key: 'museum',
    alt: 'A nineteenth-century Moroccan guembri displayed in a museum case',
    caption: 'Guembri, Morocco, 19th century',
    credit: credit('Sguastevi', BYSA4, 'Guinbri, Marroc, s. XIX.jpg'),
    focus: '50% 55%',
  },
  sersar: {
    key: 'sersar',
    alt: 'The sersar, a pierced metal plate with rings, from a Moroccan guembri',
    caption: 'Sersar from a Moroccan guembri, 19th century',
    credit: credit('Sguastevi', BYSA4, 'Sersar from Moroccan guembri, 19th century.jpg'),
  },
  berlin: {
    key: 'berlin',
    alt: 'Mehdi Qamoum smiles on stage, playing a carved guembri',
    caption: 'Mehdi Qamoum, Gnaoua festival Berlin 2019',
    credit: credit('Daniela Incoronato', BYSA4, 'Mehdi Qamoum at the Gnaoua festival of Berlin 2019 01.jpg'),
    focus: '45% 40%',
  },
  band: {
    key: 'band',
    alt: 'Gnawa musicians in turquoise robes playing qraqeb',
    caption: 'Gnawa band with qraqeb',
    credit: credit('Monaam Ben Fredj', BYSA4, 'Gnawa Band.jpg'),
    focus: '45% 35%',
  },
  // detail references for the anatomy panels of the guembri introduction
  sintir: {
    key: 'sintir',
    alt: 'A Moroccan sintir standing upright: the skin face with its bridge, the round neck and the strings',
    caption: 'Moroccan sintir (guembri), front',
    credit: credit('Richard Nowell', BYSA4, 'Moroccan Sintir Front.png'),
    focus: '50% 70%',
  },
  tortoise: {
    key: 'tortoise',
    alt: 'A small guinbri whose resonator is a tortoise shell, with a round wooden neck',
    caption: 'Guinbri with a tortoise-shell body, Swedish Museum of Performing Arts',
    credit: credit('Mikael Bodner', BYSA4, 'Guinbri - SMV - F582 03.tif'),
    focus: '50% 75%',
  },
  algeria1909: {
    key: 'algeria1909',
    alt: 'Early twentieth-century postcard of a Gnawa musician holding a guembri with jingles at the end of the neck',
    caption: 'Gnawa musician with guembri, Algeria, about 1909',
    credit: { author: 'Unknown photographer (initials L. L.)', license: 'Public domain', licenseUrl: 'https://commons.wikimedia.org/wiki/Commons:Licensing', source: commons('Gnawa musician with Guembri, has jingles on end of handle.jpg') },
    focus: '55% 45%',
  },
}

/** the intro film: real photographs, slowly drifting, cross-faded in this order */
export const INTRO_FRAMES: PhotoKey[] = ['fire', 'bekkas', 'marrakech', 'rabat']

/** optional: real footage can replace the photo film later (files in public/videos) */
export const INTRO_VIDEOS: string[] = []

export const photoMeta = (k: PhotoKey) => photos[k]
