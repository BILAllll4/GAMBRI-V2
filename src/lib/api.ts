import type { AdminReview, Category, OrderInput, OrderSummary, PaymentConfig, PaymentMethod, Product, ReviewInput, ReviewSummary } from '../../shared/schemas'

export class ApiError extends Error {
  constructor(public status: number, message: string, public issues?: { path: (string | number)[]; message: string }[]) {
    super(message)
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(`/api${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) } })
  } catch {
    throw new ApiError(0, 'The store is offline. Start the API with `npm run dev`.')
  }
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(res.status, body.error ?? `Request failed (${res.status})`, body.issues)
  return body as T
}

const post = (body?: unknown, headers?: Record<string, string>): RequestInit => ({ method: 'POST', body: body === undefined ? undefined : JSON.stringify(body), headers })
const bearer = (token: string) => ({ Authorization: `Bearer ${token}` })

export const api = {
  categories: () => request<Category[]>('/categories'),
  products: (category?: string) => request<Product[]>(`/products${category ? `?category=${encodeURIComponent(category)}` : ''}`),
  product: (slug: string) => request<Product>(`/products/${encodeURIComponent(slug)}`),
  createOrder: (input: OrderInput) => request<{ reference: string; total: number; payment: PaymentMethod }>('/orders', post(input)),
  order: (ref: string) => request<OrderSummary>(`/orders/${encodeURIComponent(ref)}`),

  paymentConfig: () => request<PaymentConfig>('/payments/config'),
  cmiStart: (ref: string, lang: string) => request<{ action: string; fields: Record<string, string> }>(`/payments/cmi/${encodeURIComponent(ref)}/start`, post({ lang })),
  paypalCreate: (ref: string) => request<{ id: string }>(`/payments/paypal/${encodeURIComponent(ref)}/create`, post()),
  paypalCapture: (ref: string) => request<{ status: 'paid' }>(`/payments/paypal/${encodeURIComponent(ref)}/capture`, post()),

  reviews: (slug: string) => request<ReviewSummary>(`/products/${encodeURIComponent(slug)}/reviews`),
  createReview: (slug: string, input: ReviewInput) => request<{ status: 'pending'; verified: boolean }>(`/products/${encodeURIComponent(slug)}/reviews`, post(input)),

  admin: {
    reviews: (token: string, status: 'pending' | 'approved') => request<AdminReview[]>(`/admin/reviews?status=${status}`, { headers: bearer(token) }),
    approve: (token: string, id: number) => request<{ ok: true }>(`/admin/reviews/${id}/approve`, post(undefined, bearer(token))),
    remove: (token: string, id: number) => request<{ ok: true }>(`/admin/reviews/${id}`, { method: 'DELETE', headers: bearer(token) }),
  },
}

export const formatMAD = (n: number) => `${new Intl.NumberFormat('fr-MA').format(n)} MAD`

/** sends the browser to CMI's payment page with the signed form from the API */
export function submitCmiForm({ action, fields }: { action: string; fields: Record<string, string> }) {
  const form = document.createElement('form')
  form.method = 'POST'
  form.action = action
  form.style.display = 'none'
  for (const [name, value] of Object.entries(fields)) {
    const input = document.createElement('input')
    input.type = 'hidden'
    input.name = name
    input.value = value
    form.appendChild(input)
  }
  document.body.appendChild(form)
  form.submit()
}
