import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Conditions générales — OnlyPok',
  description: "Conditions générales d'utilisation et de vente de la plateforme OnlyPok.",
  robots: { index: false },
}

export default function CguPage() {
  return (
    <article>
      <h1>Conditions générales d&apos;utilisation et de vente</h1>
      <p className="legal-updated">Dernière mise à jour : 3 juillet 2026</p>

      <h2>1. Objet</h2>
      <p>
        Les présentes conditions régissent l&apos;utilisation de la plateforme <strong>OnlyPok</strong>{' '}
        (onlypok.com), qui met en relation des joueurs de poker (« Élèves ») et des formateurs
        (« Coachs ») pour l&apos;achat de formations vidéo et de sessions de coaching. En créant un compte,
        tu acceptes ces conditions sans réserve.
      </p>
      <p>
        OnlyPok est une plateforme <strong>éducative</strong>. Elle ne propose aucun jeu d&apos;argent et
        ne permet aucune mise en argent réel.
      </p>

      <h2>2. Compte</h2>
      <ul>
        <li>L&apos;inscription est réservée aux personnes majeures.</li>
        <li>Tu es responsable de la confidentialité de tes identifiants et de l&apos;activité de ton compte.</li>
        <li>Un compte est personnel : le partage d&apos;accès aux contenus payants est interdit.</li>
        <li>OnlyPok peut suspendre un compte en cas de fraude, de partage de contenu ou de comportement abusif envers d&apos;autres utilisateurs.</li>
      </ul>

      <h2>3. Achats des Élèves</h2>
      <h3>3.1 Formations</h3>
      <p>
        Les formations sont des <strong>contenus numériques</strong> accessibles immédiatement après
        paiement, sans limite de durée tant que le compte est actif et que la formation reste publiée sur
        la plateforme. Les prix sont affichés en euros TTC et encaissés par notre prestataire de paiement{' '}
        <strong>Stripe</strong>.
      </p>
      <p>
        Conformément à l&apos;article L221-28 du Code de la consommation, en achetant une formation tu
        demandes son exécution immédiate et <strong>renonces expressément à ton droit de rétractation</strong>{' '}
        dès l&apos;accès au contenu.
      </p>
      <h3>3.2 Coaching</h3>
      <ul>
        <li>Les sessions de coaching sont réservées via le calendrier du Coach, après paiement.</li>
        <li>Certains Coachs valident manuellement les demandes (« sur dossier ») : en cas de refus, tu es intégralement remboursé.</li>
        <li>Annulation par l&apos;Élève plus de 24 h avant la session : report ou remboursement. Moins de 24 h avant : la session est due, sauf accord du Coach.</li>
        <li>Annulation par le Coach : remboursement intégral ou report au choix de l&apos;Élève.</li>
      </ul>

      <h2>4. Conditions applicables aux Coachs</h2>
      <ul>
        <li>Le Coach certifie l&apos;exactitude des informations et justificatifs fournis lors de son inscription (résultats, identité, statut professionnel).</li>
        <li>Le Coach est un <strong>prestataire indépendant</strong> : il est seul responsable de ses obligations fiscales et sociales et de la qualité de ses contenus.</li>
        <li>Le Coach conserve la propriété intellectuelle de ses contenus et concède à OnlyPok une licence de diffusion sur la plateforme.</li>
        <li><strong>Commission</strong> : OnlyPok prélève une commission de <strong>8 %</strong> sur chaque vente (formation ou coaching), frais de paiement inclus.</li>
        <li>
          <strong>Reversements</strong> : les gains des Coachs sont reversés <strong>par virement
          bancaire, une fois par mois</strong>, sur les coordonnées renseignées dans le profil coach, dès
          que le solde atteint 50 €. Le Coach est responsable de l&apos;exactitude de ses coordonnées
          bancaires.
        </li>
      </ul>

      <h2>5. Contenus et comportement</h2>
      <ul>
        <li>Les contenus publiés (formations, messages, avis) ne doivent être ni illicites, ni trompeurs, ni contrefaisants.</li>
        <li>Les avis publiés par les Élèves doivent refléter une expérience réelle d&apos;achat.</li>
        <li>Le contournement de la plateforme pour éviter la commission (paiement direct entre Élève et Coach pour un service initié sur OnlyPok) est interdit.</li>
      </ul>

      <h2>6. Responsabilité</h2>
      <p>
        OnlyPok fournit la mise en relation et l&apos;infrastructure technique. OnlyPok ne garantit aucun
        résultat aux jeux de poker : les gains passés des Coachs ne préjugent pas des résultats des
        Élèves. Le poker en argent réel comporte des risques financiers — joue de manière responsable
        (<a href="https://www.joueurs-info-service.fr" target="_blank" rel="noopener noreferrer">joueurs-info-service.fr</a> — 09 74 75 13 13).
      </p>
      <p>
        OnlyPok s&apos;efforce d&apos;assurer la disponibilité du service mais ne saurait être tenue
        responsable des interruptions temporaires liées à la maintenance ou à des causes extérieures.
      </p>

      <h2>7. Résiliation</h2>
      <p>
        Tu peux supprimer ton compte à tout moment en écrivant à{' '}
        <a href="mailto:contact@onlypok.com">contact@onlypok.com</a>. Les formations achetées cessent
        d&apos;être accessibles à la clôture du compte. Les soldes de gains des Coachs sont reversés lors
        du dernier cycle de paiement.
      </p>

      <h2>8. Droit applicable</h2>
      <p>
        Les présentes conditions sont soumises au droit français. En cas de litige, une solution amiable
        sera recherchée avant toute action judiciaire. Conformément aux articles L611-1 et suivants du
        Code de la consommation, l&apos;Élève consommateur peut recourir gratuitement à un médiateur de la
        consommation.
      </p>
    </article>
  )
}
