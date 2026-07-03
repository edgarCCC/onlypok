import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Politique de confidentialité — OnlyPok',
  description: 'Politique de protection des données personnelles de la plateforme OnlyPok.',
  robots: { index: false },
}

export default function ConfidentialitePage() {
  return (
    <article>
      <h1>Politique de confidentialité</h1>
      <p className="legal-updated">Dernière mise à jour : 3 juillet 2026</p>

      <p>
        Cette politique décrit comment OnlyPok collecte et traite tes données personnelles, conformément au
        Règlement général sur la protection des données (RGPD) et à la loi Informatique et Libertés.
      </p>

      <h2>1. Responsable du traitement</h2>
      <p>
        Le responsable du traitement est l&apos;éditeur du Site, identifié dans les{' '}
        <a href="/legal/mentions-legales">mentions légales</a>. Contact :{' '}
        <a href="mailto:contact@onlypok.com">contact@onlypok.com</a>.
      </p>

      <h2>2. Données collectées</h2>
      <ul>
        <li><strong>Compte</strong> : email, mot de passe (chiffré par notre prestataire d&apos;authentification), pseudo, avatar, rôle (élève ou coach).</li>
        <li><strong>Profil coach</strong> : nom, biographie, tarifs, coordonnées de paiement (IBAN ou équivalent) fournies volontairement pour recevoir les reversements.</li>
        <li><strong>Achats et réservations</strong> : historique des formations achetées et des sessions de coaching réservées. Les données bancaires de paiement sont traitées exclusivement par <strong>Stripe</strong> et ne transitent jamais par nos serveurs.</li>
        <li><strong>Usage</strong> : progression dans les cours, sessions enregistrées dans le tracker, messages échangés sur la plateforme.</li>
      </ul>

      <h2>3. Finalités et bases légales</h2>
      <ul>
        <li><strong>Fourniture du service</strong> (compte, formations, coaching, messagerie) — exécution du contrat.</li>
        <li><strong>Paiement et reversement aux coachs</strong> — exécution du contrat et obligations légales (comptabilité).</li>
        <li><strong>Emails transactionnels</strong> (confirmations, notifications de réservation) — exécution du contrat, envoyés via <strong>Resend</strong>.</li>
        <li><strong>Sécurité et prévention de la fraude</strong> — intérêt légitime.</li>
      </ul>

      <h2>4. Destinataires et sous-traitants</h2>
      <ul>
        <li><strong>Supabase</strong> (hébergement des données, authentification) — Union européenne.</li>
        <li><strong>Vercel</strong> (hébergement du site) — États-Unis, encadré par les Clauses Contractuelles Types.</li>
        <li><strong>Stripe</strong> (paiements) — encadré par les Clauses Contractuelles Types.</li>
        <li><strong>Resend</strong> (envoi d&apos;emails transactionnels).</li>
      </ul>
      <p>Aucune donnée n&apos;est vendue ni transmise à des tiers à des fins publicitaires.</p>

      <h2>5. Durées de conservation</h2>
      <ul>
        <li>Données de compte : durée de vie du compte, puis suppression sous 30 jours après clôture.</li>
        <li>Données de facturation : 10 ans (obligation légale).</li>
        <li>Messages et contenus : durée de vie du compte.</li>
      </ul>

      <h2>6. Tes droits</h2>
      <p>
        Tu disposes des droits d&apos;accès, de rectification, d&apos;effacement, de portabilité, de
        limitation et d&apos;opposition sur tes données. Pour les exercer, écris à{' '}
        <a href="mailto:contact@onlypok.com">contact@onlypok.com</a>. Tu peux également introduire une
        réclamation auprès de la CNIL (<a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer">cnil.fr</a>).
      </p>

      <h2>7. Sécurité</h2>
      <p>
        Les échanges avec le Site sont chiffrés (HTTPS). L&apos;accès aux données est restreint et les mots
        de passe ne sont jamais stockés en clair.
      </p>
    </article>
  )
}
