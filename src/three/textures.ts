/**
 * Procedural texture generation (canvas 2D → THREE.CanvasTexture).
 * Generated once at boot so the experience ships with zero texture downloads.
 * Replace with baked Blender/Substance maps for a production build (see README).
 */
import * as THREE from 'three'

/* ---------- tiny value-noise ------------------------------------------- */
function makeNoise(seed = 1) {
  const perm = new Uint8Array(512)
  let s = seed
  const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647)
  const p = Array.from({ length: 256 }, (_, i) => i)
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[p[i], p[j]] = [p[j], p[i]]
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255]
  const grad = (h: number) => (h / 255) * 2 - 1
  const fade = (t: number) => t * t * (3 - 2 * t)
  return (x: number, y: number) => {
    const xi = Math.floor(x) & 255
    const yi = Math.floor(y) & 255
    const xf = x - Math.floor(x)
    const yf = y - Math.floor(y)
    const a = grad(perm[perm[xi] + yi])
    const b = grad(perm[perm[xi + 1] + yi])
    const c = grad(perm[perm[xi] + yi + 1])
    const d = grad(perm[perm[xi + 1] + yi + 1])
    const u = fade(xf)
    const v = fade(yf)
    return a + u * (b - a) + v * (c - a) + u * v * (a - b - c + d)
  }
}

function fbm(n: (x: number, y: number) => number, x: number, y: number, oct = 4) {
  let a = 0.5
  let f = 1
  let sum = 0
  for (let i = 0; i < oct; i++) {
    sum += a * n(x * f, y * f)
    f *= 2
    a *= 0.5
  }
  return sum
}

function canvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')!
  return { c, ctx, img: ctx.createImageData(w, h) }
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

function toTex(c: HTMLCanvasElement, srgb: boolean, repeat: [number, number] = [1, 1]) {
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(...repeat)
  t.anisotropy = 8
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace
  t.needsUpdate = true
  return t
}

export interface PBRSet {
  map: THREE.Texture
  roughnessMap: THREE.Texture
  bumpMap: THREE.Texture
}

/* ---------- hand-carved hardwood (dark, oiled, with tool marks) --------- */
export function woodTextures(size = 1024, seed = 7, tone: [number, number, number] = [0.29, 0.17, 0.09]): PBRSet {
  const n = makeNoise(seed)
  const col = canvas(size, size)
  const rough = canvas(size, size)
  const bump = canvas(size, size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size
      const v = y / size
      // grain runs along U (the long axis of the instrument)
      const warp = fbm(n, u * 3, v * 6, 3) * 2.2
      const rings = Math.sin((v * 46 + warp * 3) * Math.PI)
      const fine = fbm(n, u * 90, v * 8, 2)
      const pores = n(u * 420, v * 60) > 0.55 ? 1 : 0
      const toolMarks = Math.sin(u * 140 + fbm(n, u * 4, v * 4, 2) * 6) * 0.5 + 0.5
      let g = 0.55 + rings * 0.16 + fine * 0.18 - pores * 0.12 + (toolMarks - 0.5) * 0.06
      const patina = fbm(n, u * 2 + 10, v * 2, 3) * 0.25
      g = clamp01(g + patina)
      const i = (y * size + x) * 4
      col.img.data[i] = lerp(tone[0] * 0.45, tone[0] * 1.35, g) * 255
      col.img.data[i + 1] = lerp(tone[1] * 0.45, tone[1] * 1.35, g) * 255
      col.img.data[i + 2] = lerp(tone[2] * 0.45, tone[2] * 1.35, g) * 255
      col.img.data[i + 3] = 255
      const r = clamp01(0.48 + (1 - g) * 0.22 + pores * 0.15 - patina * 0.3) * 255
      rough.img.data[i] = rough.img.data[i + 1] = rough.img.data[i + 2] = r
      rough.img.data[i + 3] = 255
      const b = clamp01(0.5 + rings * 0.12 + fine * 0.2 - pores * 0.3 + (toolMarks - 0.5) * 0.18) * 255
      bump.img.data[i] = bump.img.data[i + 1] = bump.img.data[i + 2] = b
      bump.img.data[i + 3] = 255
    }
  }
  col.ctx.putImageData(col.img, 0, 0)
  rough.ctx.putImageData(rough.img, 0, 0)
  bump.ctx.putImageData(bump.img, 0, 0)
  return { map: toTex(col.c, true), roughnessMap: toTex(rough.c, false), bumpMap: toTex(bump.c, false) }
}

/* ---------- stretched camel skin (translucent, mottled, with hair follicles) ---- */
export function skinTextures(size = 1024, seed = 3): PBRSet {
  const n = makeNoise(seed)
  const col = canvas(size, size)
  const rough = canvas(size, size)
  const bump = canvas(size, size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size
      const v = y / size
      const blotch = fbm(n, u * 3, v * 3, 5)
      const veins = Math.abs(fbm(n, u * 7 + 3, v * 7 - 2, 4))
      const vein = veins < 0.016 ? 1 - veins / 0.016 : 0
      const follicle = n(u * 600, v * 600) > 0.82 ? 1 : 0
      const stretch = fbm(n, u * 1.5, v * 12, 3) * 0.5 // long stretch marks
      const grime = clamp01(fbm(n, u * 1.2 + 40, v * 1.2, 4) + 0.15)
      const t = clamp01(0.62 + blotch * 0.35 + stretch * 0.2 - vein * 0.12 - follicle * 0.05 - grime * 0.25)
      const i = (y * size + x) * 4
      // warm parchment → honey → smoky brown
      col.img.data[i] = lerp(88, 192, t)
      col.img.data[i + 1] = lerp(62, 166, t)
      col.img.data[i + 2] = lerp(40, 124, t)
      col.img.data[i + 3] = 255
      const r = clamp01(0.62 - grime * 0.18 + follicle * 0.1 + vein * 0.05) * 255
      rough.img.data[i] = rough.img.data[i + 1] = rough.img.data[i + 2] = r
      rough.img.data[i + 3] = 255
      const b = clamp01(0.5 + blotch * 0.12 + stretch * 0.3 + vein * 0.18 - follicle * 0.08) * 255
      bump.img.data[i] = bump.img.data[i + 1] = bump.img.data[i + 2] = b
      bump.img.data[i + 3] = 255
    }
  }
  col.ctx.putImageData(col.img, 0, 0)
  rough.ctx.putImageData(rough.img, 0, 0)
  bump.ctx.putImageData(bump.img, 0, 0)
  return { map: toTex(col.c, true), roughnessMap: toTex(rough.c, false), bumpMap: toTex(bump.c, false) }
}

/* ---------- braided leather cord (for tuning rings & lacing) ------------ */
export function cordTextures(seed = 11): PBRSet {
  const size = 256
  const n = makeNoise(seed)
  const col = canvas(size, size)
  const bump = canvas(size, size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size
      const v = y / size
      const braid = Math.sin((u * 16 + v * 4) * Math.PI * 2) * 0.5 + 0.5
      const braid2 = Math.sin((u * 16 - v * 4) * Math.PI * 2) * 0.5 + 0.5
      const b = Math.max(braid * (v % 0.5 < 0.25 ? 1 : 0.6), braid2 * 0.8)
      const g = clamp01(0.35 + b * 0.5 + n(u * 40, v * 40) * 0.15)
      const i = (y * size + x) * 4
      col.img.data[i] = lerp(40, 120, g)
      col.img.data[i + 1] = lerp(24, 76, g)
      col.img.data[i + 2] = lerp(14, 42, g)
      col.img.data[i + 3] = 255
      bump.img.data[i] = bump.img.data[i + 1] = bump.img.data[i + 2] = b * 255
      bump.img.data[i + 3] = 255
    }
  }
  col.ctx.putImageData(col.img, 0, 0)
  bump.ctx.putImageData(bump.img, 0, 0)
  const map = toTex(col.c, true)
  return { map, roughnessMap: toTex(bump.c, false), bumpMap: toTex(bump.c, false) }
}

/* ---------- zellige-inspired eight-point star lattice for the backdrop -- */
export function starLatticeTexture(stroke = 'rgba(182,138,74,0.9)') {
  const size = 512
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')!
  ctx.clearRect(0, 0, size, size)
  ctx.strokeStyle = stroke
  ctx.lineWidth = 1.4
  const star = (cx: number, cy: number, r: number) => {
    for (const rot of [0, Math.PI / 4]) {
      ctx.beginPath()
      for (let i = 0; i < 4; i++) {
        const a = rot + (i * Math.PI) / 2
        const x = cx + Math.cos(a) * r
        const y = cy + Math.sin(a) * r
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      }
      ctx.closePath()
      ctx.stroke()
    }
    ctx.beginPath()
    ctx.arc(cx, cy, r * 0.32, 0, Math.PI * 2)
    ctx.stroke()
  }
  const step = size / 2
  for (let y = 0; y <= 2; y++) for (let x = 0; x <= 2; x++) star(x * step, y * step, step * 0.42)
  for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) star(x * step + step / 2, y * step + step / 2, step * 0.2)
  // connecting lines
  ctx.globalAlpha = 0.5
  for (let i = 0; i <= 2; i++) {
    ctx.beginPath()
    ctx.moveTo(0, i * step)
    ctx.lineTo(size, i * step)
    ctx.moveTo(i * step, 0)
    ctx.lineTo(i * step, size)
    ctx.stroke()
  }
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.colorSpace = THREE.SRGBColorSpace
  return t
}
