/**
 * The preloader's three.js-side work, in its own chunk so the loading screen
 * itself never waits for three / drei to download.
 */
import { Cache } from 'three'
import { useGLTF } from '@react-three/drei'

// keep downloaded files in memory: every FileLoader (useGLTF included) reads from here
Cache.enabled = true

/** hand an already-downloaded file to three's loaders (same key FileLoader uses) */
export function seedCache(url: string, data: ArrayBuffer) {
  if (Cache.get(`file:${url}`) === undefined) Cache.add(`file:${url}`, data)
}

/**
 * Parse into drei's cache. useGLTF is a plain cache read (suspend-react, no React
 * hooks inside): it throws a promise while pending and the error if loading failed.
 * It is the very entry the scenes' useGLTF() calls read, so nothing parses twice.
 */
export async function parseModel(url: string) {
  const read = useGLTF
  for (;;) {
    try {
      return read(url)
    } catch (e) {
      if (e && typeof (e as Promise<unknown>).then === 'function') await e
      else throw e
    }
  }
}

/** the shared wood / skin / cord maps, generated once for every guembri finish */
export async function buildTextures() {
  const { getTextures } = await import('../three/Guembri')
  await new Promise<void>((r) => requestAnimationFrame(() => r())) // let the bar paint before the synchronous work
  getTextures()
}
