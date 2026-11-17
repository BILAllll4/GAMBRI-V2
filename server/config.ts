import 'node:process'

const env = (k: string) => (process.env[k] ?? '').trim()

/** All runtime configuration comes from environment variables (see .env.example). */
export const config = {
  port: Number(process.env.API_PORT ?? 8787),
  db: {
    host: process.env.DB_HOST ?? '127.0.0.1',
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME ?? 'gnawa',
  },
  /** flat delivery fee in MAD; 0 until the merchant sets real rates */
  shippingFlatMad: Number(process.env.SHIPPING_FLAT_MAD ?? 0),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  /** the address visitors use (the payment gateways send them back here) */
  publicUrl: (env('PUBLIC_URL') || 'http://localhost:5173').replace(/\/$/, ''),
  /** Express "trust proxy": set when the API runs behind nginx / a host's proxy so rate limits see the real IP */
  trustProxy: env('TRUST_PROXY') || 'loopback',
  /** bearer token for /admin (review moderation); admin is closed while it is empty */
  adminToken: env('ADMIN_TOKEN'),
  /** unpaid online orders release their stock after this long */
  unpaidHoldMinutes: Number(process.env.UNPAID_HOLD_MINUTES ?? 60),

  /** CMI (Centre Monétique Interbancaire) 3D Pay Hosting — card payment in dirhams */
  cmi: {
    clientId: env('CMI_CLIENT_ID'),
    storeKey: env('CMI_STORE_KEY'),
    gatewayUrl: env('CMI_GATEWAY_URL') || 'https://testpayment.cmi.co.ma/fim/est3Dgate',
  },

  /** PayPal Checkout. PayPal does not settle MAD, so totals are converted at a fixed rate you set */
  paypal: {
    clientId: env('PAYPAL_CLIENT_ID'),
    secret: env('PAYPAL_SECRET'),
    live: env('PAYPAL_ENV') === 'live',
    currency: env('PAYPAL_CURRENCY') || 'EUR',
    /** how many dirhams make one unit of PAYPAL_CURRENCY, e.g. 10.8 for EUR */
    madPerUnit: Number(env('PAYPAL_MAD_RATE') || 0),
  },
}

export const cmiEnabled = () => !!(config.cmi.clientId && config.cmi.storeKey)
export const paypalEnabled = () => !!(config.paypal.clientId && config.paypal.secret && config.paypal.madPerUnit > 0)
