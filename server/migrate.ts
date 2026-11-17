/**
 * Brings an existing database up to date on start-up, without touching data:
 * adds the online-payment columns to `orders` and the `reviews` table.
 * (A fresh `npm run db:setup` already creates them from schema.sql.)
 */
import type { RowDataPacket } from 'mysql2'
import { pool } from './db'

const ORDER_COLUMNS: [string, string][] = [
  ['payment_status', "VARCHAR(16) NOT NULL DEFAULT 'none'"],
  ['payment_ref', 'VARCHAR(64) NULL'],
  ['paid_at', 'TIMESTAMP NULL'],
]

export async function ensureSchema() {
  const [cols] = await pool.query<RowDataPacket[]>(
    "SELECT COLUMN_NAME AS c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders'",
  )
  if (!cols.length) return // no store tables yet: `npm run db:setup` creates everything
  const have = new Set(cols.map((r) => String(r.c)))
  for (const [name, def] of ORDER_COLUMNS) {
    if (!have.has(name)) {
      await pool.query(`ALTER TABLE orders ADD COLUMN ${name} ${def}`)
      console.log(`… migrated: orders.${name}`)
    }
  }
  await pool.query(`CREATE TABLE IF NOT EXISTS reviews (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    product_id  INT           NOT NULL,
    name        VARCHAR(60)   NOT NULL,
    rating      TINYINT       NOT NULL,
    body        VARCHAR(1000) NOT NULL,
    order_ref   VARCHAR(16)   NULL,
    verified    TINYINT(1)    NOT NULL DEFAULT 0,
    approved    TINYINT(1)    NOT NULL DEFAULT 0,
    created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY ix_reviews_product (product_id, approved),
    CONSTRAINT fk_reviews_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`)
}
