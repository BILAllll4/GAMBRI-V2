/**
 * The small music button of the playing scene (also key 9): starts the music
 * on the 3D guembri and opens the list. Two kinds of entries:
 *  - five original studies, played live on the instrument (strings vibrate,
 *    notes light up) — audio/demo.ts TRACKS;
 *  - traditional repertoire as recordings (Baba Mimoun), which play once the
 *    recording is placed in public/audio/tracks — audio/demo.ts RECORDINGS.
 */
import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useGuembri } from '../../store/useGuembri'
import { TRACKS, RECORDINGS, usePlayer, startDemo, stopDemo, toggleMusic, checkRecordings, playRecording, stopRecording } from '../../audio/demo'
import { useT } from '../../lib/i18n'

function Bars({ on }: { on: boolean }) {
  return (
    <span className="flex h-3 items-end gap-[2px]" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={`w-[2px] origin-bottom bg-current ${on ? 'animate-[eq_0.9s_ease-in-out_infinite]' : ''}`}
          style={{ height: '100%', animationDelay: `${i * 0.18}s`, transform: on ? undefined : 'scaleY(0.3)' }}
        />
      ))}
    </span>
  )
}

/** YouTube's own embedded player for a recording given as a video id; follows the sound toggle */
function YouTubeRecording({ id, title }: { id: string; title: string }) {
  const frame = useRef<HTMLIFrameElement>(null)
  const muted = useGuembri((s) => s.muted)
  useEffect(() => {
    const send = () => frame.current?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func: muted ? 'mute' : 'unMute', args: [] }), '*')
    send()
    const t = window.setTimeout(send, 1500)
    return () => window.clearTimeout(t)
  }, [muted])
  return (
    <div className="mb-2 border border-gold/20 bg-[#0d1d16]/95 p-2 shadow-[0_24px_60px_-20px_rgba(0,0,0,.7)]">
      <div className="relative aspect-video w-full overflow-hidden bg-black">
        <iframe
          ref={frame}
          className="absolute inset-0 h-full w-full"
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&enablejsapi=1&playsinline=1&rel=0`}
          title={title}
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      </div>
      <div className="flex items-center justify-between px-1 pt-2">
        <span className="label text-[9px] text-gold/80">{title}</span>
        <button onClick={stopRecording} className="label text-[9px] text-ivory/50 hover:text-ivory">■ Stop</button>
      </div>
    </div>
  )
}

export function MusicPlayer() {
  const t = useT()
  const demo = useGuembri((s) => s.demo)
  const { open, track, rec, available } = usePlayer()
  const playing = demo || !!rec
  const yt = RECORDINGS.find((r) => r.id === rec && r.youtube)

  useEffect(() => {
    if (open) checkRecordings()
  }, [open])

  return (
    <div className="relative">
      <button
        onClick={toggleMusic}
        aria-expanded={open}
        aria-label={playing ? t({ en: 'Stop the music (key 9)', fr: 'Arrêter la musique (touche 9)', ar: 'أوقف الموسيقى (المفتاح 9)' }) : t({ en: 'Play music on the guembri (key 9)', fr: 'Jouer de la musique au guembri (touche 9)', ar: 'شغّل موسيقى على الكَمبري (المفتاح 9)' })}
        className={`flex h-9 items-center gap-2 rounded-full border px-3.5 transition-colors ${
          playing ? 'border-gold bg-gold text-ink' : 'border-ivory/25 text-ivory/70 hover:border-gold/70 hover:text-ivory'
        }`}
      >
        <Bars on={playing} />
        <span className="label text-[10px]">{t({ en: 'Music', fr: 'Musique', ar: 'موسيقى' })}</span>
        <kbd className={`grid h-[18px] min-w-[18px] place-items-center rounded-[4px] px-1 font-sans text-[10px] ${playing ? 'bg-ink/15' : 'bg-[#6f5544] text-ivory'}`}>9</kbd>
      </button>

      <div className="absolute bottom-12 flex w-[min(310px,calc(100vw-32px))] flex-col ltr:right-0 rtl:left-0">
      {yt?.youtube && <YouTubeRecording id={yt.youtube} title={t(yt.title)} />}
      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label="Music"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
            className="max-h-[60svh] w-full overflow-y-auto border border-gold/20 bg-[#0d1d16]/95 p-2 text-ivory shadow-[0_24px_60px_-20px_rgba(0,0,0,.7)]"
          >
            <div className="flex items-center justify-between px-3 pb-2 pt-2">
              <p className="label text-[10px] text-gold">{t({ en: 'Played on the guembri', fr: 'Joué au guembri', ar: 'تُعزف على الكَمبري' })}</p>
              <button onClick={() => usePlayer.setState({ open: false })} className="label text-[10px] text-ivory/50 hover:text-ivory" aria-label={t({ en: 'Close the list', fr: 'Fermer la liste', ar: 'أغلق القائمة' })}>
                {t({ en: 'Close', fr: 'Fermer', ar: 'إغلاق' })}
              </button>
            </div>
            <ol>
              {TRACKS.map((tr, i) => {
                const active = i === track && demo
                return (
                  <li key={tr.title.en}>
                    <button
                      onClick={() => (active ? stopDemo() : void startDemo(i))}
                      aria-pressed={active}
                      className={`flex w-full items-center gap-3 px-3 py-2.5 text-start transition-colors ${active ? 'bg-gold text-ink' : 'hover:bg-ivory/5'}`}
                    >
                      <span className={`w-5 text-[11px] tabular-nums ${active ? 'text-ink/60' : 'text-ivory/40'}`}>{active ? <Bars on /> : String(i + 1).padStart(2, '0')}</span>
                      <span className="min-w-0 flex-1">
                        <span className="display block text-[18px] leading-tight">{t(tr.title)}</span>
                        <span className={`block text-[11px] ${active ? 'text-ink/60' : 'text-ivory/50'}`}>
                          {t(tr.mood)} · {tr.bpm} bpm
                        </span>
                      </span>
                      <span className="text-[11px]" aria-hidden>
                        {active ? '■' : '▶'}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ol>

            {/* traditional repertoire: recordings */}
            <p className="label mt-2 border-t border-ivory/10 px-3 pb-1 pt-3 text-[9px] text-gold/80">{t({ en: 'Traditional', fr: 'Traditionnel', ar: 'تقليدي' })}</p>
            <ol>
              {RECORDINGS.map((r) => {
                const active = rec === r.id
                const has = available[r.id]
                return (
                  <li key={r.id}>
                    <button
                      onClick={() => (active ? stopRecording() : playRecording(r.id))}
                      disabled={!has}
                      aria-pressed={active}
                      className={`flex w-full items-center gap-3 px-3 py-2.5 text-start transition-colors disabled:cursor-not-allowed ${active ? 'bg-gold text-ink' : has ? 'hover:bg-ivory/5' : 'opacity-55'}`}
                    >
                      <span className={`w-5 text-[11px] ${active ? 'text-ink/60' : 'text-ivory/40'}`}>{active ? <Bars on /> : '◆'}</span>
                      <span className="min-w-0 flex-1">
                        <span className="display block text-[18px] leading-tight">{t(r.title)}</span>
                        <span className={`block text-[11px] ${active ? 'text-ink/60' : 'text-ivory/50'}`}>
                          {has === false ? t({ en: 'Recording to be added', fr: 'Enregistrement à ajouter', ar: 'التسجيل سيُضاف لاحقًا' }) : t(r.note)}
                        </span>
                      </span>
                      <span className="text-[11px]" aria-hidden>
                        {active ? '■' : has ? '▶' : ''}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ol>
            <p className="px-3 pb-2 pt-3 text-[10.5px] leading-relaxed text-ivory/40">
              {t({
                en: 'The numbered pieces are original studies played live on the 3D guembri. Traditional pieces play from recordings (Baba Mimoun in YouTube’s player).',
                fr: 'Les pièces numérotées sont des études originales jouées en direct sur le guembri 3D. Les pièces traditionnelles sont des enregistrements.',
                ar: 'المقطوعات المرقّمة دراسات أصلية تُعزف مباشرة على الكَمبري ثلاثي الأبعاد، أما القطع التقليدية فتُشغَّل من تسجيلات.',
              })}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </div>
  )
}
