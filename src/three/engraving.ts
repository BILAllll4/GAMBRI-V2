/**
 * Decorative surface detail for the Page 3 guembri (reference look):
 *  - a floral line engraving burnt into the skin soundboard, clipped to the
 *    real outline of the skin (taken from the GLB's own vertices), and
 *  - chip-carved diamonds running down the neck.
 * Both are drawn once into canvases (no downloads).
 */
import * as THREE from 'three'

type P = [number, number]

/** convex hull (monotone chain) of 2D points */
export function hull(points: P[]): P[] {
  const pts = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const cross = (o: P, a: P, b: P) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  const lower: P[] = []
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop()
    lower.push(p)
  }
  const upper: P[] = []
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i]
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop()
    upper.push(p)
  }
  upper.pop()
  lower.pop()
  return lower.concat(upper)
}

function rng(seed: number) {
  let s = seed
  return () => ((s = (s * 16807) % 2147483647) / 2147483647)
}

/**
 * Floral engraving for a skin whose top outline is `outline` (x, z in metres),
 * mapped onto a plane covering [minX..maxX] × [minZ..maxZ].
 */
export function skinEngraving(outline: P[], bounds: { minX: number; maxX: number; minZ: number; maxZ: number }) {
  const W = 2048
  const H = Math.round((W * (bounds.maxZ - bounds.minZ)) / (bounds.maxX - bounds.minX))
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')!
  const toPx = ([x, z]: P): P => [((x - bounds.minX) / (bounds.maxX - bounds.minX)) * W, ((z - bounds.minZ) / (bounds.maxZ - bounds.minZ)) * H]

  // clip to the skin outline, pulled in a little so the lines stop short of the edge
  const cx = outline.reduce((s, p) => s + p[0], 0) / outline.length
  const cz = outline.reduce((s, p) => s + p[1], 0) / outline.length
  const inset = (k: number) => outline.map(([x, z]) => toPx([cx + (x - cx) * k, cz + (z - cz) * k]))
  const path = (pts: P[]) => {
    ctx.beginPath()
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
    ctx.closePath()
  }

  const ink = 'rgba(92,52,22,0.62)'
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  // double border line just inside the edge
  ctx.strokeStyle = ink
  ctx.lineWidth = 3
  path(inset(0.95))
  ctx.stroke()
  ctx.lineWidth = 1.5
  path(inset(0.925))
  ctx.stroke()

  ctx.save()
  path(inset(0.9))
  ctx.clip()

  const r = rng(11)
  const flower = (x: number, y: number, s: number, petals = 5) => {
    const rot = r() * Math.PI
    ctx.lineWidth = 2.2
    for (let i = 0; i < petals; i++) {
      const a = rot + (i / petals) * Math.PI * 2
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(a)
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.bezierCurveTo(s * 0.55, -s * 0.42, s * 1.05, -s * 0.2, s, 0)
      ctx.bezierCurveTo(s * 1.05, s * 0.2, s * 0.55, s * 0.42, 0, 0)
      ctx.stroke()
      // petal vein
      ctx.beginPath()
      ctx.moveTo(s * 0.2, 0)
      ctx.lineTo(s * 0.7, 0)
      ctx.stroke()
      ctx.restore()
    }
    ctx.beginPath()
    ctx.arc(x, y, s * 0.2, 0, Math.PI * 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(x, y, s * 0.08, 0, Math.PI * 2)
    ctx.stroke()
  }
  const leaf = (x: number, y: number, a: number, s: number) => {
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(a)
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.quadraticCurveTo(s * 0.5, -s * 0.38, s, 0)
    ctx.quadraticCurveTo(s * 0.5, s * 0.38, 0, 0)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(s * 0.85, 0)
    ctx.stroke()
    ctx.restore()
  }

  // flowing vines: each is a wavy stem sprouting leaves, tendrils and flowers
  ctx.strokeStyle = ink
  const stems = 7
  for (let k = 0; k < stems; k++) {
    let x = r() * W * 0.2 - W * 0.05
    let y = (H * (k + 0.5)) / stems + (r() - 0.5) * H * 0.08
    let a = (r() - 0.5) * 0.9
    const step = W / 70
    ctx.lineWidth = 2.6
    for (let i = 0; i < 90 && x < W * 1.05; i++) {
      a += (r() - 0.5) * 0.5 + Math.sin(i * 0.35 + k) * 0.08
      a = THREE.MathUtils.clamp(a, -1.1, 1.1)
      const nx = x + Math.cos(a) * step
      const ny = y + Math.sin(a) * step
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(nx, ny)
      ctx.stroke()
      if (i % 5 === 2) leaf(nx, ny, a + (i % 10 === 2 ? -1 : 1) * (0.8 + r() * 0.5), 26 + r() * 18)
      if (i % 9 === 4) {
        // curling tendril
        ctx.lineWidth = 1.6
        ctx.beginPath()
        const side = r() > 0.5 ? 1 : -1
        for (let t = 0; t <= 1; t += 0.05) {
          const rr = 34 * (1 - t)
          const ang = a + side * (Math.PI / 2 + t * Math.PI * 2.2)
          const px = nx + Math.cos(a + side * Math.PI / 2) * 34 + Math.cos(ang + Math.PI) * rr
          const py = ny + Math.sin(a + side * Math.PI / 2) * 34 + Math.sin(ang + Math.PI) * rr
          t === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
        }
        ctx.stroke()
        ctx.lineWidth = 2.6
      }
      if (i % 13 === 8) flower(nx + Math.cos(a + 1.4) * 40, ny + Math.sin(a + 1.4) * 40, 30 + r() * 22, r() > 0.5 ? 5 : 6)
      x = nx
      y = ny
    }
  }
  // a few large blossoms
  for (let i = 0; i < 6; i++) flower(W * (0.12 + i * 0.16 + (r() - 0.5) * 0.05), H * (0.25 + r() * 0.5), 48 + r() * 18, 6)
  ctx.restore()

  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  return tex
}

/** chip-carved diamond band for the neck (u = around the neck, v = along it) */
export function neckCarving() {
  const S = 128
  const c = document.createElement('canvas')
  c.width = S
  c.height = S
  const ctx = c.getContext('2d')!
  // pale carved wood under the pattern, with a few long grain lines
  ctx.fillStyle = '#cf9f66'
  ctx.fillRect(0, 0, S, S)
  ctx.strokeStyle = 'rgba(120,72,30,0.18)'
  ctx.lineWidth = 1
  for (let x = 6; x < S; x += 11) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x + 1, S)
    ctx.stroke()
  }
  // shade the flanks so the half-round neck still reads as round from above
  const g = ctx.createLinearGradient(0, 0, S, 0)
  g.addColorStop(0, 'rgba(70,40,15,0.45)')
  g.addColorStop(0.22, 'rgba(70,40,15,0)')
  g.addColorStop(0.78, 'rgba(70,40,15,0)')
  g.addColorStop(1, 'rgba(70,40,15,0.45)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, S, S)
  // facets: the four triangles of each diamond catch the light differently
  const d = (cx: number, cy: number, w: number, h: number) => {
    const faces: [P, P, string][] = [
      [[cx, cy - h], [cx - w, cy], 'rgba(60,32,12,0.55)'],
      [[cx, cy - h], [cx + w, cy], 'rgba(60,32,12,0.32)'],
      [[cx, cy + h], [cx - w, cy], 'rgba(60,32,12,0.22)'],
      [[cx, cy + h], [cx + w, cy], 'rgba(60,32,12,0.42)'],
    ]
    for (const [a, b, col] of faces) {
      ctx.fillStyle = col
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.lineTo(a[0], a[1])
      ctx.lineTo(b[0], b[1])
      ctx.closePath()
      ctx.fill()
    }
  }
  // one row of diamonds across the top of the neck, two flanking rows of small dots
  d(S / 2, S / 2, S * 0.2, S * 0.46)
  ctx.fillStyle = 'rgba(60,32,12,0.45)'
  for (const x of [S * 0.18, S * 0.82]) {
    ctx.beginPath()
    ctx.arc(x, S / 2, S * 0.035, 0, Math.PI * 2)
    ctx.fill()
  }
  // thin incised lines along the edges of the band
  ctx.fillStyle = 'rgba(60,32,12,0.5)'
  ctx.fillRect(S * 0.04, 0, 2, S)
  ctx.fillRect(S * 0.96 - 2, 0, 2, S)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = THREE.ClampToEdgeWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.anisotropy = 8
  return tex
}

/**
 * Soft drop shadow for a flat-lay: the instrument's silhouette (body hull + the
 * neck as a bar), blurred, drawn over [minX..maxX] × [minZ..maxZ].
 */
export function dropShadow(body: P[], neck: { x0: number; x1: number; halfW: number }, bounds: { minX: number; maxX: number; minZ: number; maxZ: number }) {
  const W = 1024
  const H = Math.round((W * (bounds.maxZ - bounds.minZ)) / (bounds.maxX - bounds.minX))
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')!
  const px = (x: number) => ((x - bounds.minX) / (bounds.maxX - bounds.minX)) * W
  const pz = (z: number) => ((z - bounds.minZ) / (bounds.maxZ - bounds.minZ)) * H
  ctx.filter = `blur(${Math.round(W / 90)}px)`
  ctx.fillStyle = 'rgba(40,36,52,1)'
  ctx.beginPath()
  body.forEach(([x, z], i) => (i ? ctx.lineTo(px(x), pz(z)) : ctx.moveTo(px(x), pz(z))))
  ctx.closePath()
  ctx.fill()
  ctx.fillRect(px(neck.x0), pz(-neck.halfW), px(neck.x1) - px(neck.x0), pz(neck.halfW) - pz(-neck.halfW))
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}
