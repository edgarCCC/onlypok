// Hero : une phrase, un seul bouton plein, et l'outil lui-même à droite plutôt qu'une illustration : on joue une main avant de lire la suite.
import Button from '@/components/ui/Button'
import type { DrillPosition, OpeningRange } from '@/lib/ranges/drill'
import { LANDING_ROUTES } from '@/lib/routes'
import RangeDrill from './RangeDrill'

interface HeroProps {
  /** Au-dessus du seuil de contenus : « Voir les formations » ; sinon « Ouvrir le trainer » (D2, Q2). */
  showFormationsLink: boolean
  ranges: Record<DrillPosition, OpeningRange>
  sequence: DrillPosition[]
  firstHand: string
}

export default function Hero({ showFormationsLink, ranges, sequence, firstHand }: HeroProps) {
  return (
    <section className="lp-hero" aria-labelledby="hero-title">
      <div className="ui-wrap lp-hero-grid">
        <div className="lp-hero-copy">
          <p className="t-caps">Formations · Coaching · Trainer · Tracker</p>
          <h1 id="hero-title" className="t-display"><span>Arrête de deviner.</span><span>Apprends à décider.</span></h1>
          <p className="lp-hero-sub">Des formations vidéo, du coaching 1:1 en visio, un trainer de ranges et un tracker gratuits. Tu paies ce que tu choisis&nbsp;: pas d’abonnement.</p>
          <div className="lp-cta-row">
            <Button variant="primary" size="lg" href={LANDING_ROUTES.register}>Créer mon compte</Button>
            {showFormationsLink
              ? <Button variant="link" arrow="right" href={LANDING_ROUTES.formations}>Voir les formations</Button>
              : <Button variant="link" arrow="right" href={LANDING_ROUTES.trainer}>Ouvrir le trainer</Button>}
          </div>
          <ul className="lp-facts" aria-label="Trois faits">
            <li>Inscription gratuite</li>
            <li>Trainer sans compte</li>
            <li>Paiement sécurisé par Stripe</li>
          </ul>
        </div>
        <RangeDrill ranges={ranges} sequence={sequence} firstHand={firstHand} />
      </div>
    </section>
  )
}
