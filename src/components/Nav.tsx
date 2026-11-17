/**
 * The header: the GNAWA mark on the left, COLLECTION and CART on the right.
 * Nothing else.
 *
 * It reads what it is sitting on. Every section declares its ground with
 * data-nav="light" | "dark" (and data-nav-clear on the cinematic sections of
 * the home scroll); the header samples the element under it and switches:
 *  - over cinematic sections: no background at all, text in ivory or emerald
 *    so it stays readable on the dark green intro/portal and the light story
 *    and guembri pages;
 *  - over the collection and the store pages: once scrolled, a slim opaque bar
 *    in the ground's own colour (ivory over the collection, emerald over the
 *    dark store pages) with a hairline rule. No backdrop blur: nothing behind
 *    the header is ever blurred, the 3D models included.
 * It slims down after the first scroll; on the long home scroll it hides
 * while scrolling down and returns on the way back up. The active destination carries a brass rule.
 */
import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Logo } from './Logo'
import { useCart, cartCount } from '../store/cart'
import { scrollToTarget } from '../lib/scroll'
import { useTransitionNavigate } from './Curtain'
import { LangSwitch } from './LangSwitch'
import { useT } from '../lib/i18n'

type Ground = { tone: 'light' | 'dark'; clear: boolean; inCollection: boolean }

function sample(y: number): Ground {
  for (const el of document.elementsFromPoint(window.innerWidth / 2, y)) {
    if (el.closest('header[data-site-nav]')) continue
    const host = el.closest<HTMLElement>('[data-nav]')
    if (host) return { tone: host.dataset.nav === 'light' ? 'light' : 'dark', clear: host.hasAttribute('data-nav-clear'), inCollection: host.id === 'collection' }
  }
  return { tone: 'dark', clear: false, inCollection: false }
}

function NavLink({ active, onClick, children, label }: { active: boolean; onClick: () => void; children: React.ReactNode; label?: string }) {
  return (
    <button onClick={onClick} aria-label={label} aria-current={active ? 'page' : undefined} className="group relative flex items-center gap-2 py-2">
      <span className="label flex items-center gap-2 text-[11px] sm:text-[12px]">{children}</span>
      {/* brass rule: drawn for the active item, grows on hover for the others */}
      <span
        className={`absolute -bottom-0.5 left-0 h-px bg-brass transition-[width] duration-500 ease-[var(--ease-cine)] ${active ? 'w-full' : 'w-0 group-hover:w-full'}`}
      />
    </button>
  )
}

export function Nav() {
  const t = useT()
  const { pathname } = useLocation()
  const go = useTransitionNavigate()
  const lines = useCart((s) => s.lines)
  const setCartOpen = useCart((s) => s.setOpen)
  const count = cartCount(lines)
  const home = pathname === '/'
  const [hidden, setHidden] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [ground, setGround] = useState<Ground>({ tone: 'dark', clear: home, inCollection: false })
  const last = useRef(0)

  useEffect(() => {
    let raf = 0
    const update = () => {
      raf = 0
      const y = window.scrollY
      setScrolled(y > 40)
      if (Math.abs(y - last.current) > 6) {
        // only the long home scroll hides the header; on the store pages it stays (sticky chips sit under it)
        setHidden(home && y > last.current && y > 400)
        last.current = y
      }
      const g = sample(36)
      setGround((o) => (o.tone === g.tone && o.clear === g.clear && o.inCollection === g.inCollection ? o : g))
    }
    const on = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    last.current = window.scrollY
    // the route's sections mount (lazily) a moment after the path changes, and layouts settle
    // without scroll events: keep re-sampling the ground at a slow, cheap interval
    const t = window.setInterval(on, 400)
    update()
    window.addEventListener('scroll', on, { passive: true })
    window.addEventListener('resize', on)
    return () => {
      window.clearInterval(t)
      if (raf) cancelAnimationFrame(raf)
      window.removeEventListener('scroll', on)
      window.removeEventListener('resize', on)
    }
  }, [pathname, home])

  const light = ground.tone === 'light'
  const solid = scrolled && !ground.clear
  const ink = light ? 'text-emerald' : 'text-ivory'
  const bar = !solid ? 'bg-transparent border-transparent' : light ? 'bg-[#f4eee2] border-emerald/10' : 'bg-emerald border-ivory/10'
  const collectionActive = pathname.startsWith('/store')

  const openCollection = () => go('/store', { tone: 'gold', label: 'The collection' })

  return (
    <header
      data-site-nav
      className={`fixed inset-x-0 top-0 z-[80] border-b transition-[transform,background-color,border-color,color,height] duration-500 ease-[var(--ease-cine)] ${
        hidden ? '-translate-y-full' : 'translate-y-0'
      } ${bar} ${ink} ${solid ? 'h-14' : 'h-14 sm:h-[76px]'}`}
    >
      <div className="flex h-full items-center justify-between px-gutter">
        <button onClick={() => (home ? scrollToTarget(0) : go('/'))} aria-label="GNAWA — back to the start" className="-my-2 py-2">
          <Logo compact={solid} />
        </button>

        <nav aria-label="Main" className="flex items-center gap-4 sm:gap-9">
          <NavLink active={collectionActive} onClick={openCollection}>
            {t({ en: 'Collection', fr: 'Collection', ar: 'المجموعة' })}
          </NavLink>
          <NavLink active={pathname === '/cart'} onClick={() => setCartOpen(true)} label={`Cart, ${count} item${count === 1 ? '' : 's'}`}>
            {t({ en: 'Cart', fr: 'Panier', ar: 'السلة' })}
            <span
              className={`grid h-[18px] min-w-[18px] place-items-center rounded-full px-1 text-[10px] tracking-normal transition-colors ${
                count > 0 ? 'bg-brass text-ivory' : light ? 'border border-emerald/25 text-emerald/60' : 'border border-ivory/30 text-ivory/70'
              }`}
            >
              {count}
            </span>
          </NavLink>
          <LangSwitch light={light} />
        </nav>
      </div>
    </header>
  )
}
