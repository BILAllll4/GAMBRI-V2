/**
 * The guembri, taken apart: four components, each a real group of meshes on
 * the 3D model, with a reference photograph and two sentences.
 *
 * Statements follow the sources in SOURCES (UNESCO, the Met, Wikipedia EN/FR
 * and their references). Where they are silent or disagree (wood species, how
 * the skin is fixed), the text stays general.
 */
import type { PhotoKey } from './media'
import type { T } from '../lib/i18n'

export const SOURCES = [
  { label: 'UNESCO — Gnawa, Representative List of the Intangible Cultural Heritage of Humanity (2019)', url: 'https://ich.unesco.org/en/RL/gnawa-01170' },
  { label: 'The Metropolitan Museum of Art — Sintir (collection record 503022)', url: 'https://www.metmuseum.org/art/collection/search/503022' },
  { label: 'Wikipedia — Sintir (citing H. G. Farmer, Studies in Oriental Musical Instruments, 1931)', url: 'https://en.wikipedia.org/wiki/Sintir' },
  { label: 'Wikipédia — Guembri (citing T. Teffera, Music Instrument Collection of World Museum Vienna, 2018)', url: 'https://fr.wikipedia.org/wiki/Guembri' },
]

export type ComponentId = 'wood' | 'leather' | 'strings' | 'neck'

export interface GuembriComponent {
  id: ComponentId
  /** GLB nodes in this component (the strings are drawn in code, see GuembriString) */
  nodes: string[]
  ar: string
  fr: string
  en: string
  text: T
  photo: PhotoKey
}

export const COMPONENTS: GuembriComponent[] = [
  {
    id: 'wood',
    nodes: ['Body'],
    ar: 'الخشب',
    fr: 'Le bois',
    en: 'Wood',
    text: {
      en: 'The body is hollowed out of a single block of wood, a long box with rounded corners. Its hollow amplifies the vibration of the skin and gives the guembri its deep voice.',
      fr: 'La caisse est creusée dans un seul bloc de bois, une longue boîte aux angles arrondis. Son creux amplifie la vibration de la peau et donne au guembri sa voix grave.',
      ar: 'يُحفر الصندوق في كتلة واحدة من الخشب، على شكل علبة طويلة بزوايا مستديرة. ويضخّم تجويفه اهتزاز الجلد فيمنح الكَمبري صوته العميق.',
    },
    photo: 'museum',
  },
  {
    id: 'leather',
    nodes: ['Skin', 'Tacks', 'Lacing'],
    ar: 'الجلد',
    fr: 'La peau',
    en: 'Leather',
    text: {
      en: 'A camel or goat skin is stretched over the open face of the body and fixed round its edge. Like the membrane of a banjo, it turns the vibration of the strings into sound.',
      fr: 'Une peau de dromadaire ou de chèvre est tendue sur la face ouverte de la caisse et fixée sur son pourtour. Comme la membrane d’un banjo, elle transforme la vibration des cordes en son.',
      ar: 'يُشدّ جلد جمل أو ماعز على الوجه المفتوح للصندوق ويُثبَّت حول حافته. وكغشاء البانجو، يحوّل اهتزاز الأوتار إلى صوت.',
    },
    photo: 'sintir',
  },
  {
    id: 'strings',
    nodes: ['Bridge'],
    ar: 'الأوتار',
    fr: 'Les cordes',
    en: 'Strings',
    text: {
      en: 'Three strings, traditionally of goat gut, run over a small bridge standing on the skin. Plucked downward with the knuckle and the thumb, one carries the melody while the others drone.',
      fr: 'Trois cordes, traditionnellement en boyau de chèvre, passent sur un petit chevalet posé sur la peau. Pincées vers le bas avec la jointure et le pouce, l’une porte la mélodie, les autres bourdonnent.',
      ar: 'ثلاثة أوتار، من مصران الماعز تقليديًا، تمرّ فوق فرس صغير يقف على الجلد. وتُنقر إلى الأسفل بالمفصل والإبهام، فيحمل أحدها اللحن ويطنّ الآخران.',
    },
    photo: 'marrakech',
  },
  {
    id: 'neck',
    nodes: ['Neck', 'Bindings', 'Sersera', 'SerseraRings'],
    ar: 'الزند',
    fr: 'Le manche',
    en: 'Neck',
    text: {
      en: 'A round wooden stick passes through the body under the skin and carries the strings up to the sersera, a metal plate ringed with jingles. Instead of pegs, leather bindings hold the strings: sliding them changes the tension, and so the pitch.',
      fr: 'Un bâton rond traverse la caisse sous la peau et porte les cordes jusqu’à la sersera, une plaque de métal garnie d’anneaux. Au lieu de chevilles, des ligatures de cuir tiennent les cordes : les faire glisser change la tension, donc la hauteur.',
      ar: 'عصا خشبية مستديرة تخترق الصندوق تحت الجلد وتحمل الأوتار إلى السرسرة، وهي صفيحة معدنية بحلقات. وبدل الملاوي تشدّ الأوتارَ أربطةٌ من الجلد يغيّر تحريكها الشدَّ ومعه النغمة.',
    },
    photo: 'bekkas',
  },
]

export const COMPONENT_BY_ID = new Map(COMPONENTS.map((c) => [c.id, c]))
