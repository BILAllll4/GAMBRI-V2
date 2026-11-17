/**
 * PAGE 2 — FROM RITUAL TO NEW TERRAIN
 * An editorial "magazine" in natural beige: oversized type, asymmetric photo
 * compositions of real Gnawa photographs (credited), clip-path reveals and
 * restrained parallax. Every factual sentence is backed by a linked source.
 * The page darkens into emerald as it hands over to the guembri.
 */
import { useEffect, useRef } from 'react'
import { gsap } from '../../lib/scroll'
import { prefersReducedMotion } from '../../lib/device'
import { Figure } from '../../components/Figure'
import { Photo, CreditLine } from '../../components/ui/Photo'
import { PHOTOS } from '../../data/media'
import { TifinaghField } from '../../components/TifinaghField'
import { useT } from '../../lib/i18n'

const SOURCES = [
  {
    kind: 'Heritage listing · 2019',
    title: 'Gnawa — Representative List of the Intangible Cultural Heritage of Humanity',
    by: 'UNESCO',
    url: 'https://ich.unesco.org/en/RL/gnawa-01170',
  },
  {
    kind: 'Festival · Annual',
    title: 'Festival Gnaoua et Musiques du Monde, Essaouira',
    by: 'Official festival website',
    url: 'https://www.festival-gnaoua.net/',
  },
]

/** masked multi-line heading: each line slides up from behind its mask */
function Reveal({ lines, className = '' }: { lines: React.ReactNode[]; className?: string }) {
  return (
    <span data-reveal className={`block ${className}`}>
      {lines.map((l, i) => (
        <span key={i} className="mask">
          <span>{l}</span>
        </span>
      ))}
    </span>
  )
}

function Chapter({ n, title }: { n: string; title: string }) {
  return (
    <p className="label flex items-center gap-4 text-moss" data-fade>
      <span className="font-display text-[13px] normal-case tracking-normal text-brass">{n}</span>
      <span className="h-px w-8 bg-moss/40" />
      {title}
    </p>
  )
}

export function RitualSection() {
  const t = useT()
  const root = useRef<HTMLElement>(null)

  useEffect(() => {
    if (prefersReducedMotion()) return
    const ctx = gsap.context(() => {
      // the two headline lines glide in from opposite sides as you arrive
      gsap.fromTo('[data-h1]', { xPercent: -10 }, { xPercent: 0, ease: 'none', scrollTrigger: { trigger: '[data-headline]', start: 'top bottom', end: 'center 45%', scrub: true } })
      gsap.fromTo('[data-h2]', { xPercent: 12 }, { xPercent: 0, ease: 'none', scrollTrigger: { trigger: '[data-headline]', start: 'top bottom', end: 'center 45%', scrub: true } })
      gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el) => {
        gsap.from(el.querySelectorAll(':scope > .mask > span'), {
          yPercent: 108,
          duration: 1.3,
          ease: 'expo.out',
          stagger: 0.09,
          scrollTrigger: { trigger: el, start: 'top 86%' },
        })
      })
      gsap.utils.toArray<HTMLElement>('[data-fade]').forEach((el) => {
        gsap.from(el, { opacity: 0, y: 18, duration: 1.1, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 90%' } })
      })
      // full-bleed band: the photograph moves slower than the page
      gsap.fromTo('[data-band-img]', { yPercent: -10 }, { yPercent: 10, ease: 'none', scrollTrigger: { trigger: '[data-band]', start: 'top bottom', end: 'bottom top', scrub: true } })
      gsap.fromTo('[data-band-word]', { xPercent: 8 }, { xPercent: -8, ease: 'none', scrollTrigger: { trigger: '[data-band]', start: 'top bottom', end: 'bottom top', scrub: true } })
    }, root)
    return () => ctx.revert()
  }, [])

  return (
    <section ref={root} id="ritual" data-nav="light" data-nav-clear className="relative overflow-hidden bg-beige pb-[var(--section-y)] text-emerald" aria-label="From ritual to new terrain">
      <TifinaghField preset="editorial" opacity={0.05} />
      {/* ---------- opening spread ---------- */}
      <div className="relative grid grid-cols-12 gap-x-4 px-gutter pt-[var(--section-y)]">
        <div className="col-span-12 lg:col-span-8">
          <Chapter n="II" title={t({ en: 'From ritual to new terrain', fr: 'Du rituel à de nouveaux horizons', ar: 'من الطقس إلى آفاق جديدة' })} />
          <h2 data-headline className="display mt-8 text-[length:var(--fs-h1)] leading-[0.86] tracking-[-0.02em]">
            <span data-h1 className="block">{t({ en: 'From ritual', fr: 'Du rituel', ar: 'من الطقس' })}</span>
            <span data-h2 className="block ps-[10vw] italic text-forest">{t({ en: 'to new terrain.', fr: 'aux nouveaux horizons.', ar: 'إلى آفاق جديدة.' })}</span>
          </h2>
          <p data-fade className="lead mt-10 max-w-[38ch] text-emerald/75 lg:ml-[10vw]">
            {t({
              en: 'Gnawa brings together music, performance, fraternal practice and healing ritual. In 2019, UNESCO inscribed it on the Representative List of the Intangible Cultural Heritage of Humanity.',
              fr: 'Les Gnaoua réunissent musique, spectacle, pratique confrérique et rituel de guérison. En 2019, l’UNESCO les a inscrits sur la Liste représentative du patrimoine culturel immatériel de l’humanité.',
              ar: 'تجمع كناوة بين الموسيقى والأداء والممارسة الأخوية وطقوس العلاج. وفي سنة 2019 أدرجتها اليونسكو في القائمة التمثيلية للتراث الثقافي غير المادي للبشرية.',
            })}
          </p>
        </div>
        <Figure k="tbel" className="col-span-8 col-start-5 mt-14 sm:col-span-6 sm:col-start-7 lg:col-span-4 lg:col-start-9 lg:mt-24" aspect="aspect-[3/4]" sizes="(min-width: 1024px) 30vw, 60vw" />
      </div>

      {/* ---------- chapter I — the lila ---------- */}
      <div className="relative grid grid-cols-12 gap-x-4 px-gutter pt-[var(--section-y)]">
        <Figure k="fire" className="col-span-12 md:col-span-7" aspect="aspect-[16/10]" from="left" sizes="(min-width: 768px) 58vw, 100vw" />
        <div className="col-span-12 mt-10 md:col-span-4 md:col-start-9 md:mt-28">
          <Chapter n="I" title={t({ en: 'The lila', fr: 'La lila', ar: 'الليلة' })} />
          <h3 className="display mt-6 text-[length:var(--fs-h3)] leading-[0.98]">
            <Reveal lines={[t({ en: 'A night of', fr: 'Une nuit de', ar: 'ليلة من' }), <span className="italic">{t({ en: 'sound and healing.', fr: 'son et de guérison.', ar: 'الصوت والشفاء.' })}</span>]} />
          </h3>
          <p data-fade className="mt-6 max-w-[34ch] text-[15px] leading-relaxed text-emerald/75">
            {t({
              en: 'At the heart of Gnawa practice is the lila, an all-night ceremony led by a maâlem on the guembri, carried by the iron clatter of the qraqeb.',
              fr: 'Au cœur de la pratique gnaoua se trouve la lila, une cérémonie qui dure toute la nuit, menée par un maâlem au guembri et portée par le claquement de fer des qraqeb.',
              ar: 'في قلب ممارسة كناوة توجد الليلة، وهي حفل يدوم طوال الليل يقوده معلّم على الكَمبري، وتحمله قرقعة القراقب الحديدية.',
            })}
          </p>
        </div>
        <Figure k="qraqeb" className="col-span-6 col-start-4 mt-16 md:col-span-3 md:col-start-5 md:-mt-24" aspect="aspect-[2/3]" parallax={14} sizes="(min-width: 768px) 24vw, 50vw" />
      </div>

      {/* ---------- full-bleed band ---------- */}
      <div data-band className="relative mt-[var(--section-y)] h-[78svh] min-h-[420px] overflow-hidden bg-emerald">
        <div data-band-img className="grade-emerald absolute inset-x-0 -inset-y-[12%]">
          <Photo k="essaouira" sizes="100vw" />
        </div>
        <p data-band-word className="display pointer-events-none absolute inset-x-0 bottom-[12%] whitespace-nowrap text-center text-[clamp(64px,15vw,240px)] italic leading-none text-ivory/90">
          Essaouira
        </p>
        <p className="absolute bottom-4 right-[var(--gutter)] text-ivory/55">
          <CreditLine caption={PHOTOS.essaouira.caption} credit={PHOTOS.essaouira.credit} />
        </p>
      </div>

      {/* ---------- chapter II — the guembri ---------- */}
      <div className="relative grid grid-cols-12 gap-x-4 px-gutter pt-[var(--section-y)]">
        <div className="col-span-12 md:col-span-5">
          <Chapter n="II" title={t({ en: 'The instrument', fr: 'L’instrument', ar: 'الآلة' })} />
          <h3 className="display mt-6 text-[length:var(--fs-h2)] leading-[0.92]">
            <Reveal lines={[t({ en: 'Three strings,', fr: 'Trois cordes,', ar: 'ثلاثة أوتار،' }), <span className="italic">{t({ en: 'one voice.', fr: 'une seule voix.', ar: 'صوت واحد.' })}</span>]} />
          </h3>
          <p data-fade className="mt-6 max-w-[36ch] text-[15px] leading-relaxed text-emerald/75">
            {t({
              en: 'The guembri is a three-stringed lute played by the maâlem: a carved wooden body covered with skin, a round neck, and the sersar, a metal plate with rings at the tip.',
              fr: 'Le guembri est un luth à trois cordes joué par le maâlem : une caisse de bois sculptée tendue de peau, un manche rond et la sersar, une plaque de métal à anneaux à son extrémité.',
              ar: 'الكَمبري عود بثلاثة أوتار يعزف عليه المعلّم: صندوق خشبي منحوت مكسوّ بالجلد، وزند مستدير، والسرسار، وهي صفيحة معدنية بحلقات في طرفه.',
            })}
          </p>
          <Figure k="sersar" className="mt-12 w-[72%] md:w-[80%]" aspect="aspect-[4/3]" from="left" sizes="(min-width: 768px) 30vw, 70vw" />
        </div>
        <Figure k="bekkas" className="col-span-12 mt-14 md:col-span-6 md:col-start-7 md:mt-0" aspect="aspect-square" parallax={6} sizes="(min-width: 768px) 48vw, 100vw" />
        <Figure k="museum" className="col-span-7 col-start-6 mt-14 md:col-span-3 md:col-start-9 md:-mt-10" aspect="aspect-[3/4]" from="right" sizes="(min-width: 768px) 24vw, 58vw" />
      </div>

      {/* ---------- chapter III — the stage ---------- */}
      <div className="relative grid grid-cols-12 gap-x-4 px-gutter pt-[var(--section-y)]">
        <Figure k="stage" className="col-span-7 md:col-span-4 md:col-start-2" aspect="aspect-[2/3]" sizes="(min-width: 768px) 32vw, 58vw" />
        <div className="col-span-12 mt-12 md:col-span-5 md:col-start-7 md:mt-20">
          <Chapter n="III" title={t({ en: 'The stage', fr: 'La scène', ar: 'الخشبة' })} />
          <h3 className="display mt-6 text-[length:var(--fs-h3)] leading-[0.98]">
            <Reveal lines={[t({ en: 'From courtyards', fr: 'Des cours intérieures', ar: 'من الأفنية' }), <span className="italic">{t({ en: 'to open air.', fr: 'au plein air.', ar: 'إلى الهواء الطلق.' })}</span>]} />
          </h3>
          <p data-fade className="mt-6 max-w-[36ch] text-[15px] leading-relaxed text-emerald/75">
            {t({
              en: 'Each year in Essaouira, the Gnaoua and World Music Festival brings maâlems onto public stages, in conversation with musicians from around the world.',
              fr: 'Chaque année à Essaouira, le Festival Gnaoua et Musiques du Monde fait monter les maâlems sur des scènes publiques, en dialogue avec des musiciens du monde entier.',
              ar: 'في كل سنة بالصويرة، يحمل مهرجان كناوة وموسيقى العالم المعلّمين إلى المنصّات العامة، في حوار مع موسيقيين من أنحاء العالم.',
            })}
          </p>
          <Figure k="berlin" className="mt-12" aspect="aspect-[3/2]" from="right" sizes="(min-width: 768px) 40vw, 100vw" />
        </div>
      </div>

      {/* ---------- sources ---------- */}
      <div className="relative mx-[var(--gutter)] mt-[var(--section-y)] grid grid-cols-12 gap-x-4 border-t border-emerald/20 pt-10">
        <div className="col-span-12 md:col-span-4">
          <p className="label text-moss">{t({ en: 'Sources', fr: 'Sources', ar: 'المصادر' })}</p>
          <p className="display mt-4 text-3xl leading-tight">
            {t({ en: 'Traceable facts.', fr: 'Des faits vérifiables.', ar: 'معلومات موثّقة.' })}
            <br />
            <span className="italic">{t({ en: 'Credited photographs.', fr: 'Des photographies créditées.', ar: 'صور منسوبة لأصحابها.' })}</span>
          </p>
        </div>
        <ul className="col-span-12 mt-8 divide-y divide-emerald/15 border-y border-emerald/15 md:col-span-7 md:col-start-6 md:mt-0">
          {SOURCES.map((s) => (
            <li key={s.url}>
              <a href={s.url} target="_blank" rel="noopener noreferrer" className="group grid grid-cols-[1fr_auto] gap-4 py-5">
                <span>
                  <span className="label text-moss">{s.kind}</span>
                  <span className="display mt-1 block text-2xl leading-snug transition-colors group-hover:text-forest">{s.title}</span>
                  <span className="mt-1 block text-[12px] text-emerald/55">{s.by}</span>
                </span>
                <span className="self-center text-brass transition-transform group-hover:translate-x-1" aria-hidden>
                  ↗
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>

    </section>
  )
}
