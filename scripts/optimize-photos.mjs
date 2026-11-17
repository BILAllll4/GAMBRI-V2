/**
 * Turns source photographs (JPEG from Wikimedia Commons) into responsive
 * AVIF + WebP files under public/images/photos, plus a manifest with sizes
 * and a tiny blurred placeholder for each image.
 *
 *   node scripts/optimize-photos.mjs <folder with source jpgs>
 *
 * Sources and licences live in src/data/media.ts.
 */
import sharp from 'sharp'
import { readdir, mkdir, writeFile, readFile } from 'node:fs/promises'
import { join, parse } from 'node:path'

const src = process.argv[2]
if (!src) throw new Error('usage: node scripts/optimize-photos.mjs <source folder>')
const out = 'public/images/photos'
await mkdir(out, { recursive: true })

// intro frames are shown full screen, so they get a larger top size
const INTRO = new Set(['fire', 'bekkas', 'marrakech', 'rabat'])
// new photos are merged into the existing manifest (sources for older ones may no longer be on disk)
const manifest = JSON.parse(await readFile('src/data/photos.json', 'utf8').catch(() => '{}'))

for (const file of (await readdir(src)).filter((f) => /\.jpe?g$/i.test(f))) {
  const name = parse(file).name
  const img = sharp(join(src, file)).rotate()
  const { width, height } = await img.metadata()
  const widths = (INTRO.has(name) ? [960, 1600, 2400] : [640, 1200, 1800]).filter((w) => w <= width)
  if (!widths.length) widths.push(width)
  for (const w of widths) {
    const base = img.clone().resize({ width: w, withoutEnlargement: true })
    await base.clone().avif({ quality: 52, effort: 5 }).toFile(join(out, `${name}-${w}.avif`))
    await base.clone().webp({ quality: 74 }).toFile(join(out, `${name}-${w}.webp`))
  }
  const lqip = await img.clone().resize({ width: 24 }).blur(1.2).webp({ quality: 40 }).toBuffer()
  manifest[name] = { w: width, h: height, widths, lqip: `data:image/webp;base64,${lqip.toString('base64')}` }
  console.log(name, width + 'x' + height, widths.join(','))
}

await writeFile('src/data/photos.json', JSON.stringify(manifest, null, 2) + '\n')
console.log('wrote src/data/photos.json')
