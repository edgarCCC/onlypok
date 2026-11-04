// S6 — CTA final : le dernier mot est honnête. Un seul bouton plein, un lien vers le trainer sans compte.
import Button from '@/components/ui/Button'
import { LANDING_ROUTES } from '@/lib/routes'

export default function FinalCta() {
  return (
    <section id="cta" className="lp-final" aria-labelledby="cta-title">
      <div className="ui-wrap">
        <h2 id="cta-title" className="t-display">Crée ton compte. Le reste vient après.</h2>
        <p className="lp-final-sub">C’est gratuit. Tu choisiras une formation, un coach, ou juste le trainer.</p>
        <div className="lp-cta-row">
          <Button variant="primary" size="lg" href={LANDING_ROUTES.register}>Créer mon compte</Button>
          <Button variant="link" arrow="right" href={LANDING_ROUTES.trainer}>Continuer sans compte&nbsp;: le trainer</Button>
        </div>
      </div>
    </section>
  )
}
