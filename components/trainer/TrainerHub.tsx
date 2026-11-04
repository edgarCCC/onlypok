'use client'
// L'accueil du trainer : pas de hero, les trois outils tout de suite, chacun montré par un vrai morceau de son écran.
import Link from 'next/link'
import { GTO } from '@/lib/ranges/gto'
import Matrix from './Matrix'
import './trainer.css'

const DEMO_RANGE = GTO.BTN_100
const demoMap: Record<string, string> = {}
Object.keys(DEMO_RANGE).filter((action) => action !== 'name').forEach((action) => DEMO_RANGE[action].forEach((hand) => { demoMap[hand] = action }))

export interface TrainerHubProps {
  base: string
  links: { label: string; href: string }[]
}

export default function TrainerHub({ base, links }: TrainerHubProps) {
  return (
    <div className="tr hub">
      <header className="hub-head">
        <h1 className="t-title">Trainer</h1>
        <p className="t-2">Trois outils pour travailler tes décisions entre deux sessions. Gratuits, sans compte.</p>
      </header>
      <div className="hub-grid">
        <Link href={`${base}/ranges`} className="hub-tile hub-tile-ranges">
          <div className="hub-frag hub-frag-mx" aria-hidden="true">
            <Matrix actionOf={(combo) => demoMap[combo]} revealed current="A5s" />
          </div>
          <div className="hub-text">
            <h2 className="t-heading">Entraîneur de ranges</h2>
            <p className="t-2">Drill, quiz et explorateur sur 70 ranges d’ouverture, de 10 à 100 bb. Peins aussi la tienne et partage-la.</p>
          </div>
        </Link>
        <Link href={`${base}/equity`} className="hub-tile">
          <div className="hub-frag" aria-hidden="true">
            <p className="hub-eq"><b>A♠ K♠</b><span>46 %</span></p>
            <div className="hub-eq-bar"><i style={{ flexGrow: 46 }} /><i style={{ flexGrow: 54 }} /></div>
            <p className="hub-eq"><b>Q♥ Q♦</b><span>54 %</span></p>
          </div>
          <div className="hub-text">
            <h2 className="t-heading">Équité</h2>
            <p className="t-2">Calcule une équité main contre main, ou estime-la d’abord et compare au tirage.</p>
          </div>
        </Link>
        <Link href={`${base}/quiz`} className="hub-tile">
          <div className="hub-frag" aria-hidden="true">
            <p className="hub-spot"><span>HJ · 20 bb</span><b>QQ</b></p>
            <p className="hub-opts"><span>Fold</span><span>Raise</span><span className="is-on">Jam</span></p>
          </div>
          <div className="hub-text">
            <h2 className="t-heading">Quiz de mains</h2>
            <p className="t-2">Un spot, une décision, le raisonnement du coach juste après.</p>
          </div>
        </Link>
      </div>
      <div className="hub-foot">
        <p className="t-3">Bientôt : l’analyse de tes leaks depuis le tracker.</p>
        <nav aria-label="Aller plus loin" className="hub-links">
          {links.map(({ label, href }) => <Link key={href} href={href}>{label} <span aria-hidden="true">→</span></Link>)}
        </nav>
      </div>
    </div>
  )
}
