// S7 — pied de page : quatre colonnes, une phrase, la mention jeu responsable (L16), © avec l'année calculée.
// Icônes sociales : aucune tant que les URL sont vides (N1).
import Link from 'next/link'
import Logo from '@/components/ui/Logo'
import { LANDING_ROUTES } from '@/lib/routes'

interface FooterColumn {
  title: string
  links: { label: string; href: string }[]
}

const COLUMNS: FooterColumn[] = [
  { title: 'Produit', links: [
    { label: 'Formations', href: LANDING_ROUTES.formations },
    { label: 'Coachs', href: LANDING_ROUTES.coaches },
    { label: 'Vidéos', href: LANDING_ROUTES.videos },
  ] },
  { title: 'Outils', links: [
    { label: 'Trainer', href: LANDING_ROUTES.trainer },
    { label: 'Tracker', href: LANDING_ROUTES.tracker },
    { label: 'Calculateur d’équité', href: LANDING_ROUTES.trainerEquity },
    { label: 'Quiz de mains', href: LANDING_ROUTES.trainerQuiz },
  ] },
  { title: 'Coachs', links: [
    { label: 'Devenir coach', href: LANDING_ROUTES.becomeCoach },
    { label: 'Se connecter', href: LANDING_ROUTES.login },
  ] },
  { title: 'Légal', links: [
    { label: 'Mentions légales', href: LANDING_ROUTES.legalMentions },
    { label: 'CGU', href: LANDING_ROUTES.legalCgu },
    { label: 'Confidentialité', href: LANDING_ROUTES.legalPrivacy },
    { label: 'Cookies', href: LANDING_ROUTES.legalCookies },
  ] },
]

export default function Footer({ year }: { year: number }) {
  return (
    <footer className="lp-footer">
      <div className="ui-wrap">
        <h2 className="sr">Plan du site</h2>
        <div className="lp-fcols">
          {COLUMNS.map((column) => (
            <div key={column.title}>
              <h3 className="t-caps">{column.title}</h3>
              {column.links.map(({ label, href }) => <Link key={label} href={href}>{label}</Link>)}
            </div>
          ))}
        </div>
        <div className="lp-fnote">
          <p><Logo size="sm" label="OnlyPok" /></p>
          <p>Formations, coaching et outils d’entraînement au poker.</p>
          <p>Le poker comporte des risques&nbsp;: endettement, isolement, dépendance. Réservé aux plus de 18 ans.</p>
          <p className="num">© {year} OnlyPok</p>
        </div>
      </div>
    </footer>
  )
}
