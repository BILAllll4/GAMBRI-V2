-- GNAWA store schema (MySQL 8 / MariaDB 10.4+)
CREATE TABLE IF NOT EXISTS categories (
  slug        VARCHAR(32)  PRIMARY KEY,
  name        VARCHAR(80)  NOT NULL,
  tagline     VARCHAR(200) NOT NULL,
  position    INT          NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS products (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  slug        VARCHAR(80)  NOT NULL UNIQUE,
  category    VARCHAR(32)  NOT NULL,
  name        VARCHAR(120) NOT NULL,
  subtitle    VARCHAR(200) NOT NULL,
  description TEXT         NOT NULL,
  price_mad   INT          NOT NULL,
  image       VARCHAR(255) NULL,
  model       VARCHAR(32)  NULL,
  specs_json  TEXT         NOT NULL,
  stock       INT          NOT NULL DEFAULT 0,   -- used when the product has no variants
  is_demo     TINYINT(1)   NOT NULL DEFAULT 1,
  position    INT          NOT NULL DEFAULT 0,
  CONSTRAINT fk_products_category FOREIGN KEY (category) REFERENCES categories(slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS variants (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  product_id  INT          NOT NULL,
  name        VARCHAR(120) NOT NULL,
  price_delta INT          NOT NULL DEFAULT 0,
  stock       INT          NOT NULL DEFAULT 0,
  CONSTRAINT fk_variants_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS customers (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  full_name   VARCHAR(120) NOT NULL,
  phone       VARCHAR(20)  NOT NULL,
  email       VARCHAR(190) NULL,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_customers_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS orders (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  reference      VARCHAR(16)  NOT NULL UNIQUE,
  customer_id    INT          NOT NULL,
  status         VARCHAR(16)  NOT NULL DEFAULT 'pending',
  payment_method VARCHAR(16)  NOT NULL,
  city           VARCHAR(80)  NOT NULL,
  address        VARCHAR(300) NOT NULL,
  postal_code    VARCHAR(10)  NULL,
  notes          VARCHAR(500) NULL,
  subtotal_mad   INT          NOT NULL,
  shipping_mad   INT          NOT NULL,
  total_mad      INT          NOT NULL,
  payment_status VARCHAR(16)  NOT NULL DEFAULT 'none',  -- none (cash) | awaiting | paid | failed
  payment_ref    VARCHAR(64)  NULL,                     -- CMI transaction id or PayPal order id
  paid_at        TIMESTAMP    NULL,
  created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id) REFERENCES customers(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS order_items (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  order_id     INT          NOT NULL,
  product_id   INT          NOT NULL,
  variant_id   INT          NULL,
  name         VARCHAR(120) NOT NULL,   -- snapshot at purchase time
  variant_name VARCHAR(120) NULL,
  unit_price   INT          NOT NULL,
  quantity     INT          NOT NULL,
  CONSTRAINT fk_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_items_product FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- customer reviews: hidden until approved at /admin/reviews
CREATE TABLE IF NOT EXISTS reviews (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
