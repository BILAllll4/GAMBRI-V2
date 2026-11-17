/**
 * "From the workshop": videos of the maâlem playing and posts from the
 * workshop's Instagram account, shown after the showroom on the home page.
 *
 * To fill it:
 *  - Videos: put MP4 files (H.264, ideally under ~15 MB, 1080p or 720p) and a
 *    poster image under public/videos/workshop/, then add an entry below.
 *  - Instagram: copy a post or reel link (https://www.instagram.com/p/… or /reel/…).
 *    Instagram's official embed shows it; no token or app is needed.
 *  - INSTAGRAM_HANDLE: the account name without @, for the "Follow" link.
 *
 * While WORKSHOP_MEDIA is empty the section shows labelled placeholders.
 */
import type { T } from '../lib/i18n'

export const INSTAGRAM_HANDLE = '' // e.g. 'gnawa.atelier'

export type WorkshopItem =
  | { kind: 'video'; src: string; poster?: string; caption: T }
  | { kind: 'instagram'; url: string }

export const WORKSHOP_MEDIA: WorkshopItem[] = [
  // { kind: 'video', src: '/videos/workshop/tuning.mp4', poster: '/videos/workshop/tuning.jpg',
  //   caption: { en: 'The maâlem tunes a new guembri', fr: 'Le maâlem accorde un nouveau guembri', ar: 'المعلّم يدوزن كَمبري جديدًا' } },
  // { kind: 'instagram', url: 'https://www.instagram.com/reel/XXXXXXXXXXX/' },
]
