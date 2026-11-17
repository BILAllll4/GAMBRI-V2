/**
 * /admin/reviews — approve or delete customer reviews. Not linked from the
 * site; the API asks for ADMIN_TOKEN (.env) on every call. The token is kept
 * for this browser tab only (sessionStorage).
 */
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { api } from '../../lib/api'
import type { AdminReview } from '../../../shared/schemas'
import { Stars } from '../store/Reviews'

const KEY = 'gnawa-admin-token'
const readToken = () => {
  try {
    return sessionStorage.getItem(KEY) ?? ''
  } catch {
    return ''
  }
}

export default function AdminReviewsPage() {
  const [token, setToken] = useState(readToken)
  const [draft, setDraft] = useState('')
  const [tab, setTab] = useState<'pending' | 'approved'>('pending')
  const [rows, setRows] = useState<AdminReview[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex'
    document.head.appendChild(meta)
    return () => meta.remove()
  }, [])

  const load = useCallback(() => {
    if (!token) return
    setError('')
    api.admin.reviews(token, tab).then(setRows, (e: Error & { status?: number }) => {
      setRows(null)
      setError(e.message)
      if (e.status === 401) {
        setToken('')
        try {
          sessionStorage.removeItem(KEY)
        } catch {
          /* ignore */
        }
      }
    })
  }, [token, tab])
  useEffect(load, [load])

  const signIn = (e: FormEvent) => {
    e.preventDefault()
    try {
      sessionStorage.setItem(KEY, draft)
    } catch {
      /* ignore */
    }
    setToken(draft)
  }

  const act = async (fn: () => Promise<unknown>) => {
    try {
      await fn()
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    }
  }

  return (
    <div data-nav="dark" className="min-h-screen bg-olive px-4 pb-24 pt-28 sm:px-8 sm:pt-32">
      <p className="label text-gold">Admin</p>
      <h1 className="display mt-4 text-5xl text-ivory sm:text-6xl">Reviews</h1>

      {!token ? (
        <form onSubmit={signIn} className="mt-10 max-w-md space-y-4">
          <label className="block">
            <span className="label text-ivory/55">Admin token (ADMIN_TOKEN in .env)</span>
            <input className="field" type="password" autoComplete="current-password" value={draft} onChange={(e) => setDraft(e.target.value)} />
          </label>
          {error && <p className="text-[13px] text-[#f0c3b0]">{error}</p>}
          <button className="label bg-gold px-8 py-4 text-olive">Open</button>
        </form>
      ) : (
        <>
          <div className="mt-10 flex items-center gap-6">
            {(['pending', 'approved'] as const).map((s) => (
              <button key={s} onClick={() => setTab(s)} aria-pressed={tab === s} className={`label ${tab === s ? 'text-gold' : 'text-ivory/55 hover:text-ivory'}`}>
                {s === 'pending' ? 'Waiting for approval' : 'Published'}
              </button>
            ))}
            <button
              onClick={() => {
                setToken('')
                try {
                  sessionStorage.removeItem(KEY)
                } catch {
                  /* ignore */
                }
              }}
              className="label ms-auto text-ivory/40 hover:text-ivory"
            >
              Sign out
            </button>
          </div>
          {error && <p role="alert" className="mt-6 text-[13px] text-[#f0c3b0]">{error}</p>}
          {rows && rows.length === 0 && <p className="mt-10 text-ivory/50">Nothing here.</p>}
          <ul className="mt-8 divide-y divide-ivory/10 border-y border-ivory/10">
            {rows?.map((r) => (
              <li key={r.id} className="grid gap-4 py-6 md:grid-cols-[1fr_auto]">
                <div>
                  <p className="text-[13px] text-ivory/50">
                    <a href={`/store/${r.product.slug}`} className="text-gold hover:underline">{r.product.name}</a> · {r.createdAt}
                    {r.verified && <span className="ms-2 text-sage">✓ verified purchase</span>}
                  </p>
                  <p className="mt-2 flex items-center gap-3 text-ivory">
                    <Stars value={r.rating} className="text-gold" /> <span>{r.name}</span>
                  </p>
                  <p className="mt-2 max-w-2xl whitespace-pre-line text-[14px] text-ivory/75">{r.body}</p>
                </div>
                <div className="flex items-start gap-3">
                  {!r.approved && (
                    <button onClick={() => act(() => api.admin.approve(token, r.id))} className="label bg-gold px-5 py-3 text-olive">
                      Approve
                    </button>
                  )}
                  <button
                    onClick={() => window.confirm('Delete this review for good?') && act(() => api.admin.remove(token, r.id))}
                    className="label border border-ivory/25 px-5 py-3 text-ivory/80 hover:border-[#e0a58d] hover:text-[#f0c3b0]"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
