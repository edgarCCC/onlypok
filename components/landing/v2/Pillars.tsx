// Les quatre métiers du produit, chacun avec une phrase et de vrais morceaux d'interface. Titre à deux tons : l'affirmation, puis la précision.
import type { ReactNode } from 'react'
import Button from '@/components/ui/Button'
import { cx } from '@/lib/cx'
import type { OpeningRange } from '@/lib/ranges/drill'
import { LANDING_ROUTES } from '@/lib/routes'
import { AgendaFragment, BankrollFragment, EquityFragment, PlayerFragment, PrepFragment, ProgressFragment, QuizFragment, RangeExplorer, SessionsFragment } from './Fragments'

function Tile({ title, children, span = 6, tall = false }: { title: string; children: ReactNode; span?: 4 | 5 | 6 | 7 | 8 | 12; tall?: boolean }) {
  return (
    <article className={cx('lp-tile', `lp-span-${span}`, tall && 'lp-tile-tall')}>
      <div className="lp-tile-frag">{children}</div>
      <h3 className="lp-tile-title">{title}</h3>
    </article>
  )
}

function Pillar({ id, kicker, lead, rest, href, cta, children }: { id: string; kicker: string; lead: string; rest: string; href: string; cta: string; children: ReactNode }) {
  return (
    <section id={id} className="lp-pillar" aria-labelledby={`${id}-title`}>
      <div className="ui-wrap">
        <header className="lp-pillar-head">
          <p className="t-caps">{kicker}</p>
          <h2 id={`${id}-title`} className="lp-pillar-title">{lead} <span>{rest}</span></h2>
          <Button variant="link" arrow="right" href={href}>{cta}</Button>
        </header>
        <div className="lp-bento">{children}</div>
      </div>
    </section>
  )
}

const INDEX = [
  { id: 'entrainer', label: 'S’entraîner', text: 'Ranges, équité, quiz' },
  { id: 'etudier', label: 'Étudier', text: 'Formations par chapitres' },
  { id: 'coaching', label: 'Travailler avec un coach', text: 'Séances 1:1 en visio' },
  { id: 'analyser', label: 'Analyser', text: 'Sessions et bankroll' },
]

/** Le plan de la page : où suis-je, où puis-je aller (apple-design §16). */
export function PillarIndex() {
  return (
    <nav className="lp-index" aria-label="Sur cette page">
      <div className="ui-wrap lp-index-grid">
        {INDEX.map(({ id, label, text }) => (
          <a key={id} href={`#${id}`} className="lp-index-item">
            <span className="lp-index-label">{label}</span>
            <span className="lp-index-text">{text}</span>
          </a>
        ))}
      </div>
    </nav>
  )
}

export default function Pillars({ btnRange }: { btnRange: OpeningRange }) {
  return (
    <>
      <Pillar id="entrainer" kicker="S’entraîner" lead="Travaille tes ranges." rest="Cinq positions, quatorze profondeurs, de 10 à 100 bb. Gratuit, sans compte." href={LANDING_ROUTES.trainer} cta="Ouvrir le trainer">
        <Tile title="Explore chaque range, position par position" span={8} tall><RangeExplorer range={btnRange} /></Tile>
        <div className="lp-stack lp-span-4">
          <Tile title="Calcule une équité" span={12}><EquityFragment /></Tile>
          <Tile title="Teste-toi sur des mains" span={12}><QuizFragment /></Tile>
        </div>
      </Pillar>
      <Pillar id="etudier" kicker="Étudier" lead="Apprends par chapitres." rest="Des formations vidéo, des leçons gratuites pour te faire une idée, ta progression enregistrée." href={LANDING_ROUTES.formations} cta="Voir les formations">
        <Tile title="Suis une leçon, garde le plan sous les yeux" span={7}><PlayerFragment /></Tile>
        <Tile title="Reprends là où tu t’es arrêté" span={5}><ProgressFragment /></Tile>
      </Pillar>
      <Pillar id="coaching" kicker="Travailler avec un coach" lead="Fais relire ton jeu." rest="Un pack de séances, un créneau dans son agenda, la visio, et une page pour préparer tes mains." href={LANDING_ROUTES.coaches} cta="Voir les coachs">
        <Tile title="Réserve dans son agenda" span={7}><AgendaFragment /></Tile>
        <Tile title="Prépare la séance" span={5}><PrepFragment /></Tile>
      </Pillar>
      <Pillar id="analyser" kicker="Analyser" lead="Regarde tes chiffres." rest="Importe tes sessions Winamax et Betclic, suis ta bankroll. Le tracker est inclus." href={LANDING_ROUTES.tracker} cta="Ouvrir le tracker">
        <Tile title="Suis ta bankroll" span={7}><BankrollFragment /></Tile>
        <Tile title="Retrouve chaque session" span={5}><SessionsFragment /></Tile>
      </Pillar>
    </>
  )
}
