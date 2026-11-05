// Landing publique (D4), inspirée de la densité de GTO Wizard : l'outil d'abord, puis les quatre métiers avec de vrais morceaux d'interface.
// Composant pur : la page (app/(public)/page.tsx) fait les requêtes, la recette l'alimente avec des jeux de données.
import './landing.css'
import type { DrillDepth, DrillPosition, OpeningRange } from '@/lib/ranges/drill'
import { SHOWCASE_MIN_CONTENTS, type Showcase as ShowcaseData } from '@/lib/showcase'
import CoachBand from './CoachBand'
import Faq from './Faq'
import FinalCta from './FinalCta'
import Footer from './Footer'
import Hero from './Hero'
import Navbar from './Navbar'
import Pillars, { PillarIndex } from './Pillars'
import Showcase from './Showcase'

export interface LandingDrill {
  ranges: Record<DrillPosition, Record<DrillDepth, OpeningRange>>
  sequence: DrillPosition[]
  firstHand: string
}

export interface LandingPageProps {
  showcase: ShowcaseData
  drill: LandingDrill
  /** Année du © (calculée par la page, pour un rendu identique entre serveur et client). */
  year: number
}

export default function LandingPage({ showcase, drill, year }: LandingPageProps) {
  return (
    <div className="ui-page theme-sand">
      <a className="lp-skip" href="#main">Aller au contenu</a>
      <Navbar />
      <main id="main">
        <Hero showFormationsLink={showcase.contentCount >= SHOWCASE_MIN_CONTENTS} ranges={drill.ranges} sequence={drill.sequence} firstHand={drill.firstHand} />
        <PillarIndex />
        <Pillars />
        <Showcase showcase={showcase} />
        <Faq />
        <CoachBand />
        <FinalCta />
      </main>
      <Footer year={year} />
    </div>
  )
}
