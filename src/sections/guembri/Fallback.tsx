import { NOTES } from '../../data/notes'
import { engine } from '../../audio/engine'
import { useGuembri } from '../../store/useGuembri'

/** shown when WebGL is unavailable: the instrument stays playable by ear */
export function Fallback() {
  const active = useGuembri((s) => s.activeKey)
  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 px-6 py-16 text-center">
      <div>
        <p className="label text-gold">Interactive Guembri</p>
        <h1 className="mt-4 font-display text-4xl text-ivory">3D view unavailable</h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-ivory/60">
          Your browser or device does not support WebGL, so the 3D instrument can&apos;t be shown. You can still play the notes below
          or with your keyboard.
        </p>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {NOTES.map((n) => (
          <button
            key={n.key}
            onPointerDown={() => void engine.unlock().then(() => engine.play(n.key))}
            className={`h-16 w-14 border transition-colors ${active === n.key ? 'border-gold bg-gold text-olive' : 'border-gold/40 text-ivory hover:border-gold'}`}
          >
            <span className="block text-sm font-medium">{n.key}</span>
            <span className="block text-[10px] opacity-70">{n.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
