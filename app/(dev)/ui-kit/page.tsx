import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import KitButtons from './KitButtons'
import KitForms from './KitForms'
import KitFoundations from './KitFoundations'
import KitSurfaces from './KitSurfaces'
import styles from './ui-kit.module.css'

export const metadata: Metadata = {
  title: 'Kit de composants (développement)',
  robots: { index: false, follow: false },
}

/**
 * Kit de composants du socle de design (D9) : chaque composant dans tous ses états, comme la planche
 * .claude/finalisation/design/planche-composants.html. Page de développement : introuvable en production,
 * comme les routes app/api/migrate. Elle sert aux portes de validation et au serveur de dev.
 * C'est un inventaire, pas un écran : elle montre volontairement plus de deux éléments orange.
 */
export default function UiKitPage() {
  if (process.env.NODE_ENV === 'production') notFound()

  return (
    <main className={`ui-page ${styles.page}`}>
      <div className="ui-wrap">
        <header className={styles.head}>
          <p className="t-caps">OnlyPok · Direction artistique v2 · D9</p>
          <h1 className="t-title" style={{ marginTop: 'var(--space-2)' }}>Kit de composants</h1>
          <p>
            Trois couleurs : Charcoal <code>#21232E</code>, Royal Blue <code>#105BFF</code>, Tangerine <code>#FE8500</code>.
            Chaque composant est montré dans ses états, avec les tokens qu’il utilise. Les états survol, appui et focus sont forcés
            par les classes <code>is-hover</code>, <code>is-active</code> et <code>is-focus</code> ; les vrais états fonctionnent aussi.
          </p>
        </header>
        <KitFoundations />
        <KitButtons />
        <KitForms />
        <KitSurfaces />
      </div>
    </main>
  )
}
