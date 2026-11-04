// S5 — bande coach : le second parcours, en une bande fine. Chaque proposition correspond à une fonction livrée
// (/coach/formations/new, /coach/agenda, Stripe Checkout). Aucune commission affichée tant que X5 n'est pas tranché.
import Button from '@/components/ui/Button'
import { LANDING_ROUTES } from '@/lib/routes'

export default function CoachBand() {
  return (
    <section id="coach" aria-labelledby="coach-title">
      <div className="ui-wrap">
        <div className="lp-band">
          <div className="lp-band-text">
            <h2 id="coach-title" className="lp-band-title">Tu coaches&nbsp;?</h2>{' '}
            <p>Publie tes formations, tes vidéos et tes offres de coaching. Tu gères ton agenda&nbsp;; tes élèves réservent et paient en ligne.</p>
          </div>
          <Button href={LANDING_ROUTES.becomeCoach}>Devenir coach</Button>
        </div>
      </div>
    </section>
  )
}
