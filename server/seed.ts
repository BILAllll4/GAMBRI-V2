/**
 * npm run db:setup — creates the database + tables and loads the DEMO catalogue.
 *
 * Every product below is SAMPLE DATA (is_demo = 1): names, prices and stock are
 * placeholders for layout and checkout testing. Replace them with the real
 * catalogue (maker, materials, dimensions, prices) before going live.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import mysql from 'mysql2/promise'
import { config } from './config'

type Seed = {
  slug: string
  category: string
  name: string
  subtitle: string
  description: string
  price: number
  image: string | null
  model: 'guembri' | 'qraqeb' | null
  specs: [string, string][]
  stock?: number
  variants?: [string, number, number][] // name, price delta, stock
}

const TBC = 'To be confirmed by the maker'

const categories = [
  ['guembri', 'Guembri', 'The three-stringed voice of the lila', 1],
  ['qraqeb', 'Qraqeb', 'Iron castanets that carry the pulse', 2],
  ['accessories', 'Accessories', 'Strings, bindings and care', 3],
  ['clothing', 'Clothing', 'Textiles for the stage and the street', 4],
  ['exclusive', 'Exclusive', 'Limited pieces and gift sets', 5],
] as const

const products: Seed[] = [
  {
    slug: 'guembri-workshop-edition',
    category: 'guembri',
    name: 'Guembri — Workshop Edition',
    subtitle: 'Carved body · camel-skin soundboard · three gut strings',
    description:
      'A full-size guembri with a body hollowed from a single block of wood, a stretched skin soundboard and a sersera at the neck tip. Demo listing: maker, wood species and measurements will be supplied with the real catalogue.',
    price: 4800,
    image: '/images/renders/guembri-hero.jpg',
    model: 'guembri',
    specs: [['Strings', 'Three, gut'], ['Soundboard', 'Camel skin'], ['Body', 'Carved and hollowed wood'], ['Dimensions', TBC], ['Maker', TBC]],
    variants: [['Natural body', 0, 3], ['Dark-stained body', 300, 2]],
  },
  {
    slug: 'guembri-practice',
    category: 'guembri',
    name: 'Guembri — Practice Model',
    subtitle: 'For learning the repertoire at home',
    description:
      'A guembri intended for practice and study. Demo listing: construction details and dimensions are placeholders until the maker provides them.',
    price: 2900,
    image: '/images/renders/guembri-strings.jpg',
    model: 'guembri',
    specs: [['Strings', 'Three, gut'], ['Dimensions', TBC], ['Maker', TBC]],
    stock: 5,
  },
  {
    slug: 'qraqeb-forged-iron',
    category: 'qraqeb',
    name: 'Qraqeb — Forged Iron',
    subtitle: 'Hand-held iron castanets, sold by the pair',
    description:
      'Each hand holds two linked iron plates that are clapped together to keep the rhythm under the guembri. Demo listing: weight, finish and maker to be supplied.',
    price: 650,
    image: '/images/renders/qraqeb.jpg',
    model: 'qraqeb',
    specs: [['Material', 'Iron'], ['Weight', TBC], ['Maker', TBC]],
    variants: [['One pair (one hand)', 0, 10], ['Two pairs (both hands)', 600, 8]],
  },
  {
    slug: 'gut-string-set',
    category: 'accessories',
    name: 'Gut String Set',
    subtitle: 'Three strings for one guembri',
    description: 'Replacement gut strings for the guembri. Demo listing: gauges and origin to be supplied.',
    price: 180,
    image: null,
    model: null,
    specs: [['Contents', 'Three strings'], ['Material', 'Gut'], ['Gauges', TBC]],
    stock: 40,
  },
  {
    slug: 'leather-tuning-bindings',
    category: 'accessories',
    name: 'Leather Tuning Bindings',
    subtitle: 'Hand-cut leather for the neck bindings',
    description: 'Leather cord for re-binding the strings to the neck. Demo listing: length and leather type to be supplied.',
    price: 120,
    image: null,
    model: null,
    specs: [['Material', 'Leather'], ['Length', TBC]],
    stock: 25,
  },
  {
    slug: 'guembri-carry-bag',
    category: 'accessories',
    name: 'Guembri Carry Bag',
    subtitle: 'Padded bag sized for a full-size guembri',
    description: 'A padded bag for carrying the instrument. Demo listing: dimensions and materials to be supplied.',
    price: 750,
    image: null,
    model: null,
    specs: [['Dimensions', TBC], ['Material', TBC]],
    stock: 6,
  },
  {
    slug: 'cowrie-embroidered-cap',
    category: 'clothing',
    name: 'Cowrie-Embroidered Cap',
    subtitle: 'Embroidered cap decorated with cowrie shells',
    description: 'A cap embroidered with cowrie shells. Demo listing: maker, materials and sizing to be supplied.',
    price: 420,
    image: null,
    model: null,
    specs: [['Decoration', 'Cowrie shells'], ['Materials', TBC]],
    variants: [['S / 55 cm', 0, 4], ['M / 57 cm', 0, 6], ['L / 59 cm', 0, 3]],
  },
  {
    slug: 'linen-stage-tunic',
    category: 'clothing',
    name: 'Linen Stage Tunic',
    subtitle: 'Loose tunic in washed linen',
    description: 'A loose tunic in washed linen. Demo listing: cut, fabric weight and sizing to be supplied.',
    price: 890,
    image: null,
    model: null,
    specs: [['Fabric', 'Linen'], ['Fit', 'Relaxed'], ['Care', TBC]],
    variants: [['S', 0, 5], ['M', 0, 8], ['L', 0, 6], ['XL', 0, 3]],
  },
  {
    slug: 'collectors-guembri-numbered',
    category: 'exclusive',
    name: 'Collector’s Guembri — Numbered',
    subtitle: 'A numbered piece with a certificate',
    description: 'A numbered guembri supplied with a certificate. Demo listing: edition size, maker and details to be supplied.',
    price: 9500,
    image: '/images/renders/guembri-sersera.jpg',
    model: 'guembri',
    specs: [['Edition', TBC], ['Certificate', 'Included'], ['Maker', TBC]],
    stock: 2,
  },
  {
    slug: 'rhythm-gift-set',
    category: 'exclusive',
    name: 'Rhythm Gift Set',
    subtitle: 'One pair of qraqeb with a string set, boxed',
    description: 'A boxed set pairing qraqeb with a set of guembri strings. Demo listing.',
    price: 790,
    image: '/images/renders/qraqeb-detail.jpg',
    model: 'qraqeb',
    specs: [['Contents', 'Qraqeb (one pair) + string set'], ['Packaging', 'Gift box']],
    stock: 12,
  },
  {
    slug: 'guembri-traditional',
    category: 'guembri',
    name: 'Guembri — Traditional',
    subtitle: 'Oiled wood, full-size, built the classic way',
    description:
      'A full-size guembri in oiled mid-brown wood with a camel-skin soundboard and three gut strings. Demo listing: maker, wood species and measurements will be supplied with the real catalogue.',
    price: 4200,
    image: null,
    model: 'guembri',
    specs: [['Strings', 'Three, gut'], ['Soundboard', 'Camel skin'], ['Finish', 'Oiled'], ['Dimensions', TBC], ['Maker', TBC]],
    stock: 4,
  },
  {
    slug: 'guembri-handmade',
    category: 'guembri',
    name: 'Guembri — Handmade, Raw Wood',
    subtitle: 'Pale unstained wood, carved by hand',
    description:
      'A hand-carved guembri left in pale, unstained wood. Demo listing: maker, wood species and measurements will be supplied with the real catalogue.',
    price: 6400,
    image: null,
    model: 'guembri',
    specs: [['Strings', 'Three, gut'], ['Finish', 'Unstained'], ['Dimensions', TBC], ['Maker', TBC]],
    stock: 3,
  },
  {
    slug: 'guembri-premium-walnut',
    category: 'guembri',
    name: 'Guembri — Premium Walnut',
    subtitle: 'Deep walnut tone, selected skin',
    description:
      'A guembri in a deep walnut-toned finish with a selected skin soundboard. Demo listing: maker, wood species and measurements will be supplied with the real catalogue.',
    price: 7800,
    image: null,
    model: 'guembri',
    specs: [['Strings', 'Three, gut'], ['Finish', 'Walnut tone'], ['Dimensions', TBC], ['Maker', TBC]],
    stock: 2,
  },
  {
    slug: 'guembri-compact',
    category: 'guembri',
    name: 'Guembri — Compact',
    subtitle: 'A smaller body for younger players and travel',
    description:
      'A reduced-size guembri that is easier to carry and to hold. Demo listing: scale length and measurements will be supplied with the real catalogue.',
    price: 2400,
    image: null,
    model: 'guembri',
    specs: [['Strings', 'Three, gut'], ['Size', 'Reduced'], ['Dimensions', TBC], ['Maker', TBC]],
    stock: 6,
  },
  {
    slug: 'qraqeb-polished-steel',
    category: 'qraqeb',
    name: 'Qraqeb — Polished Steel',
    subtitle: 'Brighter tone, polished plates, sold by the pair',
    description:
      'Polished steel qraqeb with a brighter, longer ring than forged iron. Demo listing: weight, finish and maker to be supplied.',
    price: 820,
    image: null,
    model: 'qraqeb',
    specs: [['Material', 'Polished steel'], ['Weight', TBC], ['Maker', TBC]],
    variants: [['One pair (one hand)', 0, 8], ['Two pairs (both hands)', 760, 5]],
  },
]

async function main() {
  const { database, ...conn } = config.db
  const admin = await mysql.createConnection({ ...conn, multipleStatements: true })
  await admin.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
  await admin.query(`USE \`${database}\``)
  const here = path.dirname(fileURLToPath(import.meta.url))
  await admin.query(fs.readFileSync(path.join(here, 'schema.sql'), 'utf8'))

  // reseeding replaces the catalogue; pass --keep-orders to only upsert categories,
  // or --sync to add the categories and products that are missing (orders and
  // existing products, prices and stock are left exactly as they are)
  if (process.argv.includes('--sync')) {
    let added = 0
    for (const c of categories) await admin.query('INSERT IGNORE INTO categories (slug, name, tagline, position) VALUES (?,?,?,?)', [...c])
    for (const [pos, p] of products.entries()) {
      const [found] = await admin.query<mysql.RowDataPacket[]>('SELECT id FROM products WHERE slug = ?', [p.slug])
      if (found.length) continue
      const specs = JSON.stringify(p.specs.map(([label, value]) => ({ label, value })))
      const [res] = await admin.query<mysql.ResultSetHeader>(
        `INSERT INTO products (slug, category, name, subtitle, description, price_mad, image, model, specs_json, stock, is_demo, position)
         VALUES (?,?,?,?,?,?,?,?,?,?,1,?)`,
        [p.slug, p.category, p.name, p.subtitle, p.description, p.price, p.image, p.model, specs, p.stock ?? 0, pos],
      )
      for (const [name, delta, stock] of p.variants ?? []) {
        await admin.query('INSERT INTO variants (product_id, name, price_delta, stock) VALUES (?,?,?,?)', [res.insertId, name, delta, stock])
      }
      added++
    }
    console.log(`… --sync: ${added} product(s) added, existing catalogue and orders untouched`)
  } else if (process.argv.includes('--keep-orders')) {
    console.log('… --keep-orders: catalogue left untouched')
  } else {
    await admin.query('SET FOREIGN_KEY_CHECKS = 0')
    for (const t of ['reviews', 'order_items', 'orders', 'customers', 'variants', 'products', 'categories']) await admin.query(`TRUNCATE TABLE ${t}`)
    await admin.query('SET FOREIGN_KEY_CHECKS = 1')
    for (const c of categories) await admin.query('INSERT INTO categories (slug, name, tagline, position) VALUES (?,?,?,?)', [...c])
    let pos = 0
    for (const p of products) {
      const specs = JSON.stringify(p.specs.map(([label, value]) => ({ label, value })))
      const [res] = await admin.query<mysql.ResultSetHeader>(
        `INSERT INTO products (slug, category, name, subtitle, description, price_mad, image, model, specs_json, stock, is_demo, position)
         VALUES (?,?,?,?,?,?,?,?,?,?,1,?)`,
        [p.slug, p.category, p.name, p.subtitle, p.description, p.price, p.image, p.model, specs, p.stock ?? 0, pos++],
      )
      for (const [name, delta, stock] of p.variants ?? []) {
        await admin.query('INSERT INTO variants (product_id, name, price_delta, stock) VALUES (?,?,?,?)', [res.insertId, name, delta, stock])
      }
    }
  }
  console.log(`✓ database "${database}" ready — ${categories.length} categories, ${products.length} demo products`)
  await admin.end()
}

main().catch((e) => {
  console.error('✗ db setup failed:', e.message)
  console.error('  Is MySQL running? Check DB_HOST / DB_USER / DB_PASSWORD in .env')
  process.exit(1)
})
