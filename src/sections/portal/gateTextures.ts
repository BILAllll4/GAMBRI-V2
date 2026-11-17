/**
 * Procedural PBR textures for the palace gate (PalaceGate.tsx).
 * Each drawing is rendered three times from the same seed: colour, height
 * (bump: grout and carving sit lower) and roughness (glazed tile is glossy,
 * grout and plaster are matt), so light catches the surfaces like the real ones.
 */
import * as THREE from 'three'

type Mode = 'color' | 'height' | 'rough'
type Draw = (g: CanvasRenderingContext2D, s: number, mode: Mode, rand: () => number) => void
export type PBR = { map: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture; roughnessMap: THREE.CanvasTexture }

function rng(seed: number) {
  let s = seed
  return () => ((s = (s * 16807) % 2147483647) / 2147483647)
}

/** one tile drawn as colour / height / roughness maps; world UVs → one tile every `metres` */
export function pbr(size: number, draw: Draw, metres: number | [number, number], seed = 7): PBR {
  const make = (mode: Mode) => {
    const c = document.createElement('canvas')
    c.width = c.height = size
    draw(c.getContext('2d')!, size, mode, rng(seed))
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = mode === 'color' ? THREE.SRGBColorSpace : THREE.NoColorSpace
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.anisotropy = 8
    const [mx, my] = typeof metres === 'number' ? [metres, metres] : metres
    t.repeat.set(1 / mx, 1 / my)
    return t
  }
  return { map: make('color'), bumpMap: make('height'), roughnessMap: make('rough') }
}

/** vary a hex colour by ±k (glaze and firing are never perfectly even) */
function jitter(hex: string, k: number, rand: () => number) {
  const c = new THREE.Color(hex)
  const f = 1 + (rand() * 2 - 1) * k
  c.r = Math.min(1, c.r * f)
  c.g = Math.min(1, c.g * f)
  c.b = Math.min(1, c.b * f)
  return `#${c.getHexString()}`
}

export function star8(g: CanvasRenderingContext2D, cx: number, cy: number, r: number, inner = 0.72) {
  g.beginPath()
  for (let i = 0; i < 16; i++) {
    const a = (i * Math.PI) / 8 - Math.PI / 8
    const rr = i % 2 ? r * inner : r
    const x = cx + Math.cos(a) * rr
    const y = cy + Math.sin(a) * rr
    if (i) g.lineTo(x, y)
    else g.moveTo(x, y)
  }
  g.closePath()
}

/* ------------------------------------------------------------------ zellige */

export type Palette = { ground: string; star: string; inner: string; points: string[]; line: string }

/**
 * Cut-tile zellige: an eight-pointed star with a rosette, stars at the corners,
 * diamonds on the edges, black outline pieces, and pale grout between pieces.
 */
export function zellige(pal: Palette, metres: number, seed = 3) {
  return pbr(
    512,
    (g, s, mode, rand) => {
      const h = s / 2
      const grout = s * 0.008
      // piece fill per mode: colour (jittered), height (slightly uneven pieces), roughness (glossy)
      const piece = (col: string) => {
        if (mode === 'color') return jitter(col, 0.07, rand)
        if (mode === 'height') {
          const v = 190 + Math.floor(rand() * 30)
          return `rgb(${v},${v},${v})`
        }
        const v = 40 + Math.floor(rand() * 40)
        return `rgb(${v},${v},${v})`
      }
      // grout everywhere first (recessed, matt, pale)
      g.fillStyle = mode === 'color' ? '#bdb6a8' : mode === 'height' ? '#1e1e1e' : '#e6e6e6'
      g.fillRect(0, 0, s, s)

      // ground pieces: small squares of the ground colour, each its own piece
      const n = 8
      const c = s / n
      for (let i = 0; i < n; i++)
        for (let j = 0; j < n; j++) {
          g.fillStyle = piece(pal.ground)
          g.fillRect(i * c + grout, j * c + grout, c - grout * 2, c - grout * 2)
        }

      const shape = (fn: () => void, col: string, outline = true) => {
        fn()
        g.fillStyle = piece(col)
        g.fill()
        if (outline) {
          g.lineWidth = grout * 2.2
          g.strokeStyle = mode === 'color' ? '#bdb6a8' : mode === 'height' ? '#1e1e1e' : '#e6e6e6'
          g.stroke()
        }
      }
      // black outline bands (cut pieces) under the stars
      const band = (fn: () => void) => {
        fn()
        g.lineWidth = s * 0.022
        g.strokeStyle = mode === 'color' ? jitter(pal.line, 0.15, rand) : mode === 'height' ? '#c8c8c8' : '#303030'
        g.stroke()
      }
      const corners = [
        [0, 0],
        [s, 0],
        [0, s],
        [s, s],
      ]
      corners.forEach(([x, y], i) => {
        band(() => star8(g, x, y, s * 0.25))
        shape(() => star8(g, x, y, s * 0.24), pal.points[i % pal.points.length])
        shape(() => star8(g, x, y, s * 0.1), pal.inner)
      })
      ;[
        [h, 0],
        [0, h],
        [s, h],
        [h, s],
      ].forEach(([x, y], i) => {
        shape(() => {
          g.beginPath()
          g.moveTo(x, y - s * 0.085)
          g.lineTo(x + s * 0.085, y)
          g.lineTo(x, y + s * 0.085)
          g.lineTo(x - s * 0.085, y)
          g.closePath()
        }, pal.points[(i + 1) % pal.points.length])
      })
      band(() => star8(g, h, h, s * 0.35))
      shape(() => star8(g, h, h, s * 0.34), pal.star)
      // the rosette: eight petals round a small star
      for (let k = 0; k < 8; k++) {
        const a = (k * Math.PI) / 4
        shape(() => {
          g.beginPath()
          g.ellipse(h + Math.cos(a) * s * 0.15, h + Math.sin(a) * s * 0.15, s * 0.05, s * 0.025, a, 0, Math.PI * 2)
        }, pal.inner)
      }
      shape(() => star8(g, h, h, s * 0.08), pal.points[0])

      if (mode === 'color') {
        // glaze: a few pinholes and light crazing
        for (let i = 0; i < 900; i++) {
          g.fillStyle = `rgba(${rand() > 0.5 ? '255,255,255' : '40,30,20'},${rand() * 0.07})`
          g.fillRect(rand() * s, rand() * s, 1.5, 1.5)
        }
      }
    },
    metres,
    seed,
  )
}

/* ------------------------------------------------------------------ carved stucco */

/** carved white plaster (gebs): rows of lobed cells with deep recesses */
export function stucco(metres: number) {
  return pbr(
    256,
    (g, s, mode, rand) => {
      g.fillStyle = mode === 'color' ? '#e9e0cc' : mode === 'height' ? '#ffffff' : '#e0e0e0'
      g.fillRect(0, 0, s, s)
      const n = 4
      const c = s / n
      for (let j = 0; j < n; j++)
        for (let i = -1; i <= n; i++) {
          const x = i * c + (j % 2 ? c / 2 : 0) + c / 2
          const y = j * c + c / 2
          // the recess (radial: deepest in the middle)
          const gr = g.createRadialGradient(x, y + c * 0.04, 0, x, y, c * 0.42)
          if (mode === 'color') {
            gr.addColorStop(0, '#a89676')
            gr.addColorStop(0.7, '#cbbd9f')
            gr.addColorStop(1, 'rgba(233,224,204,0)')
          } else if (mode === 'height') {
            gr.addColorStop(0, '#202020')
            gr.addColorStop(0.75, '#909090')
            gr.addColorStop(1, 'rgba(255,255,255,0)')
          } else {
            gr.addColorStop(0, '#f2f2f2')
            gr.addColorStop(1, 'rgba(224,224,224,0)')
          }
          g.fillStyle = gr
          g.beginPath()
          // a pointed lobe (drop shape)
          g.moveTo(x, y - c * 0.44)
          g.bezierCurveTo(x + c * 0.42, y - c * 0.1, x + c * 0.3, y + c * 0.42, x, y + c * 0.42)
          g.bezierCurveTo(x - c * 0.3, y + c * 0.42, x - c * 0.42, y - c * 0.1, x, y - c * 0.44)
          g.fill()
          // a raised bud in the middle of each lobe
          g.fillStyle = mode === 'color' ? '#efe6d2' : mode === 'height' ? '#d0d0d0' : '#d8d8d8'
          g.beginPath()
          g.arc(x, y + c * 0.06, c * 0.08, 0, Math.PI * 2)
          g.fill()
        }
      if (mode === 'color')
        for (let i = 0; i < 500; i++) {
          g.fillStyle = `rgba(120,100,70,${rand() * 0.06})`
          g.fillRect(rand() * s, rand() * s, 2, 2)
        }
    },
    metres,
  )
}

/* ------------------------------------------------------------------ cedar */

/** cedar carved in a girih of eight-pointed stars, with real grain */
export function carvedCedar(metres: number, seed = 11) {
  return pbr(
    512,
    (g, s, mode, rand) => {
      // wood ground with grain
      g.fillStyle = mode === 'color' ? '#9a5326' : mode === 'height' ? '#b4b4b4' : '#9a9a9a'
      g.fillRect(0, 0, s, s)
      for (let i = 0; i < 260; i++) {
        const x = rand() * s
        const dark = rand() > 0.45
        if (mode === 'color') g.strokeStyle = `rgba(${dark ? '72,32,10' : '212,140,78'},${0.05 + rand() * 0.1})`
        else if (mode === 'height') g.strokeStyle = `rgba(${dark ? '150,150,150' : '200,200,200'},${0.1 + rand() * 0.15})`
        else g.strokeStyle = `rgba(${dark ? '190,190,190' : '120,120,120'},${0.1 + rand() * 0.1})`
        g.lineWidth = 0.6 + rand() * 2.2
        g.beginPath()
        g.moveTo(x, 0)
        g.bezierCurveTo(x + 8 * (rand() - 0.5), s * 0.33, x + 8 * (rand() - 0.5), s * 0.66, x + 4 * (rand() - 0.5), s)
        g.stroke()
      }
      const h = s / 2
      // the interlace: wide raised straps with a sunk channel either side
      const strap = (fn: () => void) => {
        // channel (deep)
        fn()
        g.lineWidth = s * 0.05
        g.strokeStyle = mode === 'color' ? 'rgba(52,20,4,.85)' : mode === 'height' ? '#101010' : '#d0d0d0'
        g.stroke()
        // strap (raised, catching light)
        fn()
        g.lineWidth = s * 0.026
        g.strokeStyle = mode === 'color' ? 'rgba(196,118,56,.95)' : mode === 'height' ? '#f4f4f4' : '#707070'
        g.stroke()
      }
      strap(() => star8(g, h, h, s * 0.4, 0.68))
      strap(() => star8(g, h, h, s * 0.2, 0.68))
      for (const [x, y] of [
        [0, 0],
        [s, 0],
        [0, s],
        [s, s],
      ])
        strap(() => star8(g, x, y, s * 0.22, 0.68))
      strap(() => {
        g.beginPath()
        for (let k = 0; k < 8; k++) {
          const a = (k * Math.PI) / 4
          g.moveTo(h + Math.cos(a) * s * 0.4, h + Math.sin(a) * s * 0.4)
          g.lineTo(h + Math.cos(a) * s * 0.72, h + Math.sin(a) * s * 0.72)
        }
      })
      // a carved rosette in each star
      for (const [x, y, r] of [
        [h, h, 0.07],
        [0, 0, 0.06],
        [s, 0, 0.06],
        [0, s, 0.06],
        [s, s, 0.06],
      ]) {
        const gr = g.createRadialGradient(x, y, 0, x, y, s * r)
        if (mode === 'color') {
          gr.addColorStop(0, '#c07a40')
          gr.addColorStop(1, '#4a1c06')
        } else if (mode === 'height') {
          gr.addColorStop(0, '#e0e0e0')
          gr.addColorStop(1, '#202020')
        } else {
          gr.addColorStop(0, '#808080')
          gr.addColorStop(1, '#c0c0c0')
        }
        g.fillStyle = gr
        g.beginPath()
        g.arc(x, y, s * r, 0, Math.PI * 2)
        g.fill()
      }
    },
    metres,
    seed,
  )
}

/* ------------------------------------------------------------------ plaster */

/** draw something nine times (wrapped) so a tiling texture has no seams */
function wrapped(s: number, fn: (dx: number, dy: number) => void) {
  for (const dx of [-s, 0, s]) for (const dy of [-s, 0, s]) fn(dx, dy)
}

/**
 * Lime plaster as it ages on a Moroccan wall: trowelled patches, mottling,
 * repaired areas in a slightly different tone, hairline cracks, pores and
 * small chips. Seamless (everything is drawn wrapped).
 */
export function plaster(metres: number, tone = '#ece2cd', seed = 23) {
  return pbr(
    512,
    (g, s, mode, rand) => {
      const base = new THREE.Color(tone)
      g.fillStyle = mode === 'color' ? tone : mode === 'height' ? '#808080' : '#e4e4e4'
      g.fillRect(0, 0, s, s)

      // trowel strokes: broad, flat, overlapping arcs with soft edges
      for (let i = 0; i < 260; i++) {
        const x = rand() * s
        const y = rand() * s
        const rx = 20 + rand() * 70
        const ry = rx * (0.35 + rand() * 0.3)
        const rot = rand() * Math.PI
        const light = rand() > 0.5
        const a = 0.025 + rand() * 0.05
        g.fillStyle =
          mode === 'color'
            ? `rgba(${light ? '255,251,240' : '140,116,82'},${a})`
            : mode === 'height'
              ? `rgba(${light ? '255,255,255' : '0,0,0'},${a * 1.6})`
              : `rgba(${light ? '160,160,160' : '255,255,255'},${a})`
        wrapped(s, (dx, dy) => {
          g.beginPath()
          g.ellipse(x + dx, y + dy, rx, ry, rot, 0, Math.PI * 2)
          g.fill()
        })
      }

      // repaired patches: irregular areas in a fresher or older lime
      for (let i = 0; i < 5; i++) {
        const cx = rand() * s
        const cy = rand() * s
        const r = 30 + rand() * 60
        const pts: [number, number][] = []
        for (let k = 0; k < 12; k++) {
          const a = (k / 12) * Math.PI * 2
          const rr = r * (0.6 + rand() * 0.5)
          pts.push([Math.cos(a) * rr, Math.sin(a) * rr])
        }
        const c = base.clone().offsetHSL((rand() - 0.5) * 0.02, (rand() - 0.5) * 0.06, (rand() - 0.5) * 0.06)
        wrapped(s, (dx, dy) => {
          g.beginPath()
          pts.forEach(([px, py], k) => (k ? g.lineTo(cx + px + dx, cy + py + dy) : g.moveTo(cx + px + dx, cy + py + dy)))
          g.closePath()
          g.fillStyle = mode === 'color' ? `#${c.getHexString()}` : mode === 'height' ? 'rgba(160,160,160,.5)' : 'rgba(200,200,200,.5)'
          g.fill()
          // the patch edge is a slight ridge
          g.lineWidth = 1.5
          g.strokeStyle = mode === 'color' ? 'rgba(120,100,70,.12)' : mode === 'height' ? 'rgba(255,255,255,.6)' : 'rgba(255,255,255,.2)'
          g.stroke()
        })
      }

      // hairline cracks: short branching random walks
      const crack = (x: number, y: number, len: number, ang: number, w: number) => {
        let px = x
        let py = y
        for (let k = 0; k < len; k++) {
          ang += (rand() - 0.5) * 0.9
          const nx = px + Math.cos(ang) * 3
          const ny = py + Math.sin(ang) * 3
          wrapped(s, (dx, dy) => {
            g.beginPath()
            g.moveTo(px + dx, py + dy)
            g.lineTo(nx + dx, ny + dy)
            g.lineWidth = w
            g.strokeStyle = mode === 'color' ? 'rgba(90,70,45,.45)' : mode === 'height' ? 'rgba(0,0,0,.9)' : 'rgba(255,255,255,.8)'
            g.stroke()
          })
          px = nx
          py = ny
          if (rand() < 0.05 && len > 10) crack(px, py, Math.floor(len / 3), ang + (rand() > 0.5 ? 0.8 : -0.8), w * 0.7)
        }
      }
      for (let i = 0; i < 4; i++) crack(rand() * s, rand() * s, 20 + Math.floor(rand() * 40), rand() * Math.PI * 2, 0.9 + rand() * 0.6)

      // small chips where the lime has flaked off (darker, lower)
      for (let i = 0; i < 26; i++) {
        const x = rand() * s
        const y = rand() * s
        const r = 1.5 + rand() * 4
        wrapped(s, (dx, dy) => {
          g.beginPath()
          g.ellipse(x + dx, y + dy, r * 1.4, r, rand() * Math.PI, 0, Math.PI * 2)
          g.fillStyle = mode === 'color' ? 'rgba(170,140,100,.55)' : mode === 'height' ? 'rgba(0,0,0,.6)' : 'rgba(255,255,255,.6)'
          g.fill()
        })
      }

      // pores and grit
      for (let i = 0; i < 4000; i++) {
        const dark = rand() > 0.35
        g.fillStyle =
          mode === 'color' ? `rgba(${dark ? '100,80,52' : '255,252,244'},${rand() * 0.14})` : mode === 'height' ? `rgba(${dark ? '0,0,0' : '255,255,255'},.35)` : `rgba(255,255,255,${rand() * 0.3})`
        g.fillRect(rand() * s, rand() * s, 1 + rand(), 1 + rand())
      }
    },
    metres,
    seed,
  )
}

/**
 * Weathering by height, added to a wall material's shader: rising damp and
 * splash-back near the ground (an uneven, streaked edge), and a large, slow
 * variation in tone so the plaster never reads as one repeated tile.
 * Costs a few instructions per pixel; no extra textures or geometry.
 */
export function weather(mat: THREE.MeshStandardMaterial, strength = 1, grime = '#6e5a40') {
  const uGrime = { value: new THREE.Color(grime) }
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uGrime = uGrime
    sh.uniforms.uStrength = { value: strength }
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;')
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
varying vec3 vWPos;
uniform vec3 uGrime;
uniform float uStrength;
float wHash(float n) { return fract(sin(n * 127.1) * 43758.5453); }
float wNoise(float x) { float i = floor(x); float f = fract(x); return mix(wHash(i), wHash(i + 1.0), f * f * (3.0 - 2.0 * f)); }
float wNoise2(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  float a = wHash(i.x + i.y * 57.0), b = wHash(i.x + 1.0 + i.y * 57.0);
  float c = wHash(i.x + (i.y + 1.0) * 57.0), d = wHash(i.x + 1.0 + (i.y + 1.0) * 57.0);
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}`,
      )
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
{
  // rising damp: an uneven tide line, with thin streaks reaching higher
  float edge = 0.45 + 0.45 * wNoise(vWPos.x * 1.3) + 0.35 * pow(wNoise(vWPos.x * 9.0 + 4.0), 6.0);
  float damp = 1.0 - smoothstep(0.0, edge, vWPos.y);
  // splash-back right at the ground
  float splash = 1.0 - smoothstep(0.0, 0.22, vWPos.y);
  // large, slow variation in tone over the whole wall
  float tone = wNoise2(vWPos.xy * 0.45) * 0.6 + wNoise2(vWPos.xy * 1.7) * 0.4;
  vec3 c = diffuseColor.rgb;
  c *= mix(vec3(1.0), uGrime / max(max(uGrime.r, uGrime.g), uGrime.b) * 0.82, damp * 0.6 * uStrength);
  c *= 1.0 - splash * 0.22 * uStrength;
  c *= 0.93 + 0.12 * tone;
  diffuseColor.rgb = c;
}`,
      )
  }
  mat.customProgramCacheKey = () => `weather-${strength}`
  return mat
}

/* ------------------------------------------------------------------ ground */

/** a cobbled court: rounded setts in staggered rows, mortar between */
export function cobbles(metres: number) {
  return pbr(
    512,
    (g, s, mode, rand) => {
      g.fillStyle = mode === 'color' ? '#7d7367' : mode === 'height' ? '#202020' : '#f0f0f0'
      g.fillRect(0, 0, s, s)
      const rows = 8
      const rh = s / rows
      for (let r = 0; r < rows; r++) {
        let x = r % 2 ? -rh * 0.5 : 0
        while (x < s) {
          const w = rh * (0.8 + rand() * 0.6)
          const cx = x + w / 2
          const cy = r * rh + rh / 2
          const gr = g.createRadialGradient(cx - w * 0.1, cy - rh * 0.15, 1, cx, cy, Math.max(w, rh) * 0.55)
          if (mode === 'color') {
            const base = new THREE.Color().setHSL(0.08 + rand() * 0.04, 0.12 + rand() * 0.1, 0.42 + rand() * 0.16)
            gr.addColorStop(0, `#${base.clone().offsetHSL(0, 0, 0.08).getHexString()}`)
            gr.addColorStop(1, `#${base.clone().offsetHSL(0, 0, -0.12).getHexString()}`)
          } else if (mode === 'height') {
            gr.addColorStop(0, '#f0f0f0')
            gr.addColorStop(1, '#707070')
          } else {
            gr.addColorStop(0, '#909090')
            gr.addColorStop(1, '#c8c8c8')
          }
          g.fillStyle = gr
          g.beginPath()
          g.roundRect(x + 2, r * rh + 2, w - 4, rh - 4, rh * 0.3)
          g.fill()
          x += w
        }
      }
    },
    metres,
  )
}
