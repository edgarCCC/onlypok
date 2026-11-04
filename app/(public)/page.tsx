import type { Metadata } from 'next'
import LandingPage from '@/components/landing/v2/LandingPage'
import { DRILL_SEQUENCE, buildOpeningRange, handOfDay } from '@/lib/ranges/drill'
import { getShowcase } from '@/lib/showcase'

/* Landing publique (D4). Composant serveur : quatre requêtes anonymes (lib/showcase.ts), une main du jour
   déterministe (date UTC), des données déjà prêtes passées aux sections. Un visiteur connecté est redirigé
   par proxy.ts vers son espace (sauf ?preview=1). Aucun cookie n'est lu : la page est statique, régénérée
   toutes les 5 minutes, ce qui suffit pour un seuil. */
export const revalidate = 300

const TITLE = 'OnlyPok — Formations poker, coaching 1:1 et trainer de ranges'
const DESCRIPTION = 'Formations vidéo par chapitres, coaching 1:1 en visio et trainer de ranges gratuit. Tu paies ce que tu choisis, sans abonnement.'

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: '/' },
  openGraph: { title: TITLE, description: DESCRIPTION, url: '/', type: 'website', siteName: 'OnlyPok', locale: 'fr_FR' },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
}

export default async function HomePage() {
  const now = new Date()
  const showcase = await getShowcase(now)
  const ranges = { BTN: buildOpeningRange('BTN'), CO: buildOpeningRange('CO') }
  const sequence = [...DRILL_SEQUENCE]
  const firstHand = handOfDay(ranges[sequence[0]], now)

  return <LandingPage showcase={showcase} drill={{ ranges, sequence, firstHand }} year={now.getUTCFullYear()} />
}
