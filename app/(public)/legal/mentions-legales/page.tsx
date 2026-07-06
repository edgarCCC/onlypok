import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Mentions légales',
  description: 'Mentions légales de la plateforme OnlyPok.',
  robots: { index: false },
}

const Placeholder = ({ children }: { children: React.ReactNode }) => (
  <span className="legal-placeholder">[À COMPLÉTER : {children}]</span>
)

export default function MentionsLegalesPage() {
  return (
    <article>
      <h1>Mentions légales</h1>
      <p className="legal-updated">Dernière mise à jour : 3 juillet 2026</p>

      <h2>1. Éditeur du site</h2>
      <p>
        Le site <strong>onlypok.com</strong> (ci-après « le Site ») est édité par :
      </p>
      <ul>
        <li><strong>Dénomination</strong> : <Placeholder>raison sociale ou nom de l&apos;auto-entrepreneur</Placeholder></li>
        <li><strong>Forme juridique</strong> : <Placeholder>SAS, SARL, micro-entreprise…</Placeholder></li>
        <li><strong>Siège social</strong> : <Placeholder>adresse complète</Placeholder></li>
        <li><strong>SIREN / SIRET</strong> : <Placeholder>numéro</Placeholder></li>
        <li><strong>Directeur de la publication</strong> : <Placeholder>nom du responsable</Placeholder></li>
        <li><strong>Contact</strong> : <a href="mailto:contact@onlypok.com">contact@onlypok.com</a></li>
      </ul>

      <h2>2. Hébergement</h2>
      <p>
        Le Site est hébergé par <strong>Vercel Inc.</strong>, 340 S Lemon Ave #4133, Walnut, CA 91789,
        États-Unis — <a href="https://vercel.com" target="_blank" rel="noopener noreferrer">vercel.com</a>.
      </p>
      <p>
        Les données (comptes, contenus) sont stockées par <strong>Supabase Inc.</strong> —{' '}
        <a href="https://supabase.com" target="_blank" rel="noopener noreferrer">supabase.com</a>, sur des
        serveurs situés dans l&apos;Union européenne.
      </p>

      <h2>3. Nature du service</h2>
      <p>
        OnlyPok est une plateforme de <strong>formation et de coaching au poker</strong> : cours vidéo,
        sessions de coaching individuelles et outils d&apos;entraînement. OnlyPok{' '}
        <strong>ne propose aucun jeu d&apos;argent</strong>, ne permet aucune mise en argent réel et
        n&apos;est pas un opérateur de jeux au sens de la loi n° 2010-476 du 12 mai 2010.
      </p>

      <h2>4. Propriété intellectuelle</h2>
      <p>
        L&apos;ensemble des éléments du Site (textes, graphismes, logo, vidéos, structure) est protégé par
        le droit de la propriété intellectuelle. Les contenus de formation publiés par les coachs restent
        la propriété de leurs auteurs. Toute reproduction ou diffusion sans autorisation écrite préalable
        est interdite.
      </p>

      <h2>5. Signalement</h2>
      <p>
        Pour signaler un contenu illicite ou un problème sur le Site, écris-nous à{' '}
        <a href="mailto:contact@onlypok.com">contact@onlypok.com</a>.
      </p>
    </article>
  )
}
