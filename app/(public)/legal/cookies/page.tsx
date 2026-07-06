import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Politique de cookies',
  description: 'Utilisation des cookies sur la plateforme OnlyPok.',
  robots: { index: false },
}

export default function CookiesPage() {
  return (
    <article>
      <h1>Politique de cookies</h1>
      <p className="legal-updated">Dernière mise à jour : 3 juillet 2026</p>

      <h2>1. Qu&apos;est-ce qu&apos;un cookie&nbsp;?</h2>
      <p>
        Un cookie est un petit fichier déposé sur ton appareil lors de la visite d&apos;un site. Il permet
        notamment de te maintenir connecté d&apos;une page à l&apos;autre.
      </p>

      <h2>2. Cookies utilisés par OnlyPok</h2>
      <p>
        OnlyPok utilise uniquement des <strong>cookies strictement nécessaires</strong> au fonctionnement
        du service :
      </p>
      <ul>
        <li>
          <strong>Cookies d&apos;authentification</strong> (préfixés <code>sb-</code>, déposés par
          Supabase) : maintiennent ta session connectée. Durée : jusqu&apos;à déconnexion ou expiration de
          la session.
        </li>
        <li>
          <strong>Cookies de paiement</strong> : lors d&apos;un paiement, Stripe peut déposer des cookies
          nécessaires à la sécurisation de la transaction et à la prévention de la fraude.
        </li>
      </ul>
      <p>
        Ces cookies étant indispensables au service, ils ne nécessitent pas de consentement préalable
        (article 82 de la loi Informatique et Libertés). OnlyPok n&apos;utilise{' '}
        <strong>aucun cookie publicitaire ni de suivi tiers</strong>.
      </p>

      <h2>3. Gérer les cookies</h2>
      <p>
        Tu peux supprimer les cookies à tout moment depuis les réglages de ton navigateur. Attention : la
        suppression des cookies d&apos;authentification te déconnectera de ton compte.
      </p>

      <h2>4. Évolution</h2>
      <p>
        Si OnlyPok venait à intégrer des outils de mesure d&apos;audience ou tout autre cookie non
        essentiel, cette page serait mise à jour et une bannière de consentement serait mise en place au
        préalable.
      </p>
    </article>
  )
}
