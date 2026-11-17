/**
 * Cinematic route transitions: a curtain of deep olive (or portal gold) sweeps
 * across, the route changes underneath, and the curtain lifts.
 */
import { create } from 'zustand'
import { AnimatePresence, motion } from 'framer-motion'
import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { prefersReducedMotion } from '../lib/device'

type Tone = 'olive' | 'gold'
const useCurtain = create<{ visible: boolean; tone: Tone; label: string; set: (p: Partial<{ visible: boolean; tone: Tone; label: string }>) => void }>(
  (set) => ({ visible: false, tone: 'olive', label: '', set: (p) => set(p) }),
)

const COVER_MS = 750

export function useTransitionNavigate() {
  const navigate = useNavigate()
  return useCallback(
    (to: string, opts: { tone?: Tone; label?: string } = {}) => {
      if (prefersReducedMotion()) return navigate(to)
      useCurtain.getState().set({ visible: true, tone: opts.tone ?? 'olive', label: opts.label ?? '' })
      window.setTimeout(() => {
        navigate(to)
        window.scrollTo(0, 0)
        window.setTimeout(() => useCurtain.getState().set({ visible: false }), 250)
      }, COVER_MS)
    },
    [navigate],
  )
}

export function Curtain() {
  const { visible, tone, label } = useCurtain()
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="curtain"
          className={`fixed inset-0 z-[90] flex items-center justify-center ${tone === 'gold' ? 'bg-[#e7c98d]' : 'bg-olive'}`}
          initial={{ clipPath: 'inset(100% 0% 0% 0%)' }}
          animate={{ clipPath: 'inset(0% 0% 0% 0%)', transition: { duration: COVER_MS / 1000, ease: [0.76, 0, 0.24, 1] } }}
          exit={{ clipPath: 'inset(0% 0% 100% 0%)', transition: { duration: 0.8, ease: [0.76, 0, 0.24, 1] } }}
        >
          {tone === 'gold' && <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_55%,#fff4d6_0%,#e7c98d_45%,#b18a52_100%)]" />}
          {label && (
            <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.3 } }} className={`label relative ${tone === 'gold' ? 'text-olive' : 'text-gold'}`}>
              {label}
            </motion.p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
