/**
 * What the loading screen waits for, and how progress is measured.
 *
 * Every number comes from real work finishing — no timers:
 *   model     public/models/guembri.glb, by bytes received (starts at once, no 3D code needed)
 *   code      the route's page chunk + the three.js helpers chunk (threeTasks)
 *   scenes    the route's 3D scene chunks, imported once the model is in THREE.Cache
 *   parse     the GLB parsed into drei's useGLTF cache (the same entry the scenes read)
 *   textures  the procedural wood / skin / cord maps shared by every finish
 *   hero      the first intro photograph actually decoded in the page (home only)
 *   fonts     the web fonts the page has asked for
 *
 * The project ships ONE guembri model; the selection's three guembris and the store
 * finishes are that model with other materials, so it is downloaded and parsed once
 * and every instance clones it. The scene chunks call useGLTF.preload() when they
 * evaluate, so they are imported only after the downloaded bytes are in THREE.Cache:
 * the file is never requested twice (a scene already rendering behind the loading
 * screen shares the in-flight download, see shareDownload).
 *
 * What the first screen doesn't need (the portal scene on the home page, the model on
 * non-3D routes) is fetched after the reveal, while idle. A failed asset is logged and
 * counted as settled: it never holds the site hostage — the 3D sections keep their own
 * fallbacks.
 */
import { GUEMBRI_GLB } from './assets'

type Report = (fraction: number) => void
type Load = () => Promise<unknown>

/* ---------------- loaders (no three.js here) ----------------------------- */

/** fetch with byte progress; resolves with the body */
async function download(url: string, report: Report): Promise<ArrayBuffer> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`)
  const total = Number(res.headers.get('content-length')) || 0
  if (!res.body || !total || res.headers.get('content-encoding')) {
    const buf = await res.arrayBuffer()
    report(1)
    return buf
  }
  const reader = res.body.getReader()
  const out = new Uint8Array(total)
  let got = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    if (got + value.length > total) throw new Error(`${url}: longer than its content-length`)
    out.set(value, got)
    got += value.length
    report(got / total)
  }
  return out.buffer
}

/**
 * Share one in-flight download with three's FileLoader. A page that renders a 3D
 * scene behind the loading screen (the store's showroom) calls useGLTF before the
 * bytes reach THREE.Cache; without this its loader would fetch the file a second
 * time. Only this exact URL is intercepted, and only until the cache is seeded.
 */
function shareDownload(url: string, bytes: Promise<ArrayBuffer>) {
  const native = window.fetch
  const target = new URL(url, location.href).href
  const shared: typeof fetch = (input, init) => {
    const href = typeof input === 'string' ? new URL(input, location.href).href : input instanceof URL ? input.href : input.url
    if (href !== target) return native(input, init)
    return bytes.then(
      (buf) => new Response(buf.slice(0), { headers: { 'Content-Type': 'model/gltf-binary', 'Content-Length': String(buf.byteLength) } }),
      () => native(input, init),
    )
  }
  window.fetch = shared
  return () => {
    if (window.fetch === shared) window.fetch = native
  }
}

/** wait for the first intro photo the page itself renders (an eager <img>), decoded */
function heroImage(timeoutMs = 12000) {
  return new Promise<void>((resolve) => {
    const start = performance.now()
    const done = () => resolve()
    const look = () => {
      const img = document.querySelector<HTMLImageElement>('[data-intro-film] img')
      if (img) {
        if (img.complete && img.naturalWidth) img.decode().then(done, done)
        else {
          img.addEventListener('load', () => img.decode().then(done, done), { once: true })
          img.addEventListener('error', done, { once: true })
          window.setTimeout(done, Math.max(0, timeoutMs - (performance.now() - start)))
        }
        return
      }
      if (performance.now() - start > timeoutMs) return resolve()
      window.setTimeout(look, 60)
    }
    look()
  })
}

/** resolve a set of imports, reporting the share settled; a failed chunk still settles */
function chunks(imports: Load[], report: Report) {
  let n = 0
  return Promise.all(
    imports.map((load) =>
      load()
        .catch((e) => console.warn('[preload] chunk failed', e))
        .finally(() => report(++n / imports.length)),
    ),
  )
}

const loadThree = () => import('./threeTasks')

/* ---------------- per-route plan ----------------------------------------- */

interface Plan {
  page: Load[]
  scenes: Load[]
  model: boolean
  hero: boolean
  /** fetched after the reveal, while idle */
  later: Load[]
}

function planFor(path: string): Plan {
  const none: Plan = { page: [], scenes: [], model: false, hero: false, later: [] }
  if (path === '/' || path === '') {
    return {
      page: [() => import('../pages/Experience')],
      scenes: [() => import('../sections/guembri/GuembriScene')],
      model: true,
      hero: true,
      later: [() => import('../sections/portal/PortalScene')],
    }
  }
  if (path === '/store' || path === '/cart') {
    return {
      ...none,
      page: [path === '/store' ? () => import('../pages/store/StorePage') : () => import('../pages/store/CartPage')],
      scenes: [() => import('../sections/showroom/ShowroomScene'), () => import('../pages/store/CollectionScene')],
      model: true,
    }
  }
  if (path.startsWith('/store/')) {
    return { ...none, page: [() => import('../pages/store/ProductPage')], scenes: [() => import('../three/ProductViewer')], model: true }
  }
  if (path === '/checkout') return { ...none, page: [() => import('../pages/store/CheckoutPage')] }
  if (path.startsWith('/order/')) return { ...none, page: [() => import('../pages/store/OrderPage')] }
  return none
}

/* ---------------- runner -------------------------------------------------- */

const WEIGHTS = { model: 45, code: 15, scenes: 10, parse: 10, textures: 10, hero: 10, fonts: 5 }
type Step = keyof typeof WEIGHTS

/**
 * Loads everything the route needs before its first screen, reporting overall
 * progress (0..1, each step weighted by its share of the work).
 */
export async function runPreload(path: string, onProgress: (p: number) => void) {
  const plan = planFor(path)
  // a deep link (/#guembri) lands below the intro: its photo isn't the first screen
  if (location.hash) plan.hero = false
  const steps: Step[] = ['fonts']
  if (plan.page.length || plan.model) steps.push('code')
  if (plan.model) steps.push('model', 'scenes', 'parse', 'textures')
  if (plan.hero) steps.push('hero')

  const total = steps.reduce((s, k) => s + WEIGHTS[k], 0)
  const done = Object.fromEntries(steps.map((k) => [k, 0])) as Record<Step, number>
  const reporter =
    (k: Step): Report =>
    (f) => {
      const v = Math.min(1, Math.max(done[k], f))
      if (v === done[k]) return
      done[k] = v
      onProgress(steps.reduce((s, x) => s + done[x] * WEIGHTS[x], 0) / total)
    }
  /** run a step; failures are logged and count as settled */
  const t0 = performance.now()
  const step = (k: Step, run: (r: Report) => Promise<unknown>) =>
    Promise.resolve()
      .then(() => run(reporter(k)))
      .catch((e) => console.warn(`[preload] ${k} failed — continuing without it`, e))
      .finally(() => {
        reporter(k)(1)
        if (import.meta.env.DEV) console.info(`[preload] ${k} settled at ${Math.round(performance.now() - t0)}ms`)
      })

  const work: Promise<unknown>[] = [step('fonts', () => document.fonts.ready)]
  if (plan.hero) work.push(step('hero', () => heroImage()))

  if (!plan.model) {
    work.push(step('code', (r) => chunks(plan.page, r)))
  } else {
    let bytes: ArrayBuffer | null = null
    let release = () => {}
    const model = step('model', (r) => {
      const dl = download(GUEMBRI_GLB, r)
      release = shareDownload(GUEMBRI_GLB, dl)
      return dl.then((b) => (bytes = b))
    })
    const code = step('code', (r) => chunks([...plan.page, loadThree], r))
    const three = Promise.all([model, code]).then(async () => {
      try {
        const t = await loadThree()
        if (bytes) t.seedCache(GUEMBRI_GLB, bytes)
        return t
      } finally {
        release()
      }
    })
    work.push(
      model,
      code,
      // the scenes evaluate useGLTF.preload(): only once the bytes are cached
      step('scenes', (r) => three.then(() => chunks(plan.scenes, r))),
      step('parse', () => three.then((t) => t.parseModel(GUEMBRI_GLB))),
      step('textures', () => three.then((t) => t.buildTextures())),
    )
  }

  await Promise.all(work)
  onProgress(1)
}

/** after the reveal: warm what later sections need, one at a time, when idle */
export function loadLater(path: string) {
  const plan = planFor(path)
  const queue: Load[] = [...plan.later]
  if (!plan.model) queue.push(() => loadThree().then((t) => t.parseModel(GUEMBRI_GLB)))
  const idle = (cb: () => void) =>
    typeof window.requestIdleCallback === 'function' ? window.requestIdleCallback(cb, { timeout: 4000 }) : window.setTimeout(cb, 1200)
  const next = () => {
    const load = queue.shift()
    if (!load) return
    idle(() => {
      load()
        .catch((e) => console.warn('[preload] background asset failed', e))
        .finally(next)
    })
  }
  next()
}
