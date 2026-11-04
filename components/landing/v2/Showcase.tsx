// S4 — vitrine conditionnelle (D2 §2.6) : rangées indépendantes, masquées sous les seuils, jamais une section vide.
// Les seuls chiffres de la page (« 12 coachs », « 30 formations et vidéos ») viennent des compteurs, au-dessus des seuils seulement.
import Button from '@/components/ui/Button'
import List from '@/components/ui/List'
import { LANDING_ROUTES } from '@/lib/routes'
import { SHOWCASE_COACHES_LIMIT, SHOWCASE_CONTENTS_LIMIT, showcaseState, type Showcase as ShowcaseData } from '@/lib/showcase'
import { formatInt, plural } from './format'
import { CoachRow, ContentRow } from './ShowcaseRows'

function CompactCoaches({ showcase }: { showcase: ShowcaseData }) {
  return (
    <div className="lp-showrow">
      <header className="ui-section-head">
        <div className="ui-section-head-text">
          <h3 className="t-title">Les premiers coachs</h3>
          <p className="ui-section-sub">Le catalogue s’ouvre avec eux.</p>
        </div>
      </header>
      <List aria-label="Les premiers coachs">
        {showcase.coaches.map((coach) => <CoachRow key={coach.id} coach={coach} />)}
      </List>
    </div>
  )
}

function FullCoaches({ showcase }: { showcase: ShowcaseData }) {
  return (
    <div className="lp-showrow">
      <header className="ui-section-head">
        <div className="ui-section-head-text"><h3 className="t-title">Les coachs</h3></div>
        <div className="ui-section-action">
          <Button variant="link" arrow="right" href={LANDING_ROUTES.coaches} className="num">{plural(showcase.coachCount, 'coach')} · Voir tous les coachs</Button>
        </div>
      </header>
      <List columns={2} className="lp-trunc" aria-label="Les coachs">
        {showcase.coaches.slice(0, SHOWCASE_COACHES_LIMIT).map((coach) => <CoachRow key={coach.id} coach={coach} />)}
      </List>
      <Button variant="link" arrow="right" href={LANDING_ROUTES.coaches} className="lp-more">Voir tous les coachs</Button>
    </div>
  )
}

function Contents({ showcase }: { showcase: ShowcaseData }) {
  return (
    <div className="lp-showrow">
      <header className="ui-section-head">
        <div className="ui-section-head-text"><h3 className="t-title">Formations et vidéos</h3></div>
        <div className="ui-section-action">
          <Button variant="link" arrow="right" href={LANDING_ROUTES.formations} className="num">{formatInt(showcase.contentCount)} formations et vidéos · Voir le catalogue</Button>
        </div>
      </header>
      <List columns={2} className="lp-trunc" aria-label="Formations et vidéos">
        {showcase.contents.slice(0, SHOWCASE_CONTENTS_LIMIT).map((content) => <ContentRow key={content.id} content={content} />)}
      </List>
      <Button variant="link" arrow="right" href={LANDING_ROUTES.formations} className="lp-more">Voir le catalogue</Button>
    </div>
  )
}

export default function Showcase({ showcase }: { showcase: ShowcaseData }) {
  const state = showcaseState(showcase)
  if (state.coaches === 'hidden' && state.contents === 'hidden') return null
  return (
    <section id="vitrine" className="lp-pillar" aria-labelledby="vitrine-title">
      <div className="ui-wrap">
        <h2 id="vitrine-title" className="sr">Déjà sur OnlyPok</h2>
        {state.coaches === 'compact' ? <CompactCoaches showcase={showcase} /> : null}
        {state.coaches === 'full' ? <FullCoaches showcase={showcase} /> : null}
        {state.contents === 'full' ? <Contents showcase={showcase} /> : null}
      </div>
    </section>
  )
}
