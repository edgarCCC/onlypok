# components/ui — socle de design v2 (D9)

Direction artistique : `.claude/finalisation/design/DIRECTION-ARTISTIQUE.md` (tokens §1.2, contrastes §1.3, règles grep §5). Rendu de référence : `.claude/finalisation/design/planche-composants.html`. Kit vivant, serveur de dev seulement : `/ui-kit` (`app/(dev)/ui-kit`, 404 en production).

Tokens : `styles/tokens.css` (`:root` + `@theme`, importé par `app/globals.css`). Styles des composants : `styles/ui.css` (classes `ui-*` ; aides typographiques `.t-display`, `.t-title`, `.t-heading`, `.t-label`, `.t-caps`, `.t-2`, `.t-3`, `.num`, `.big-num`, `.clamp2`, `.sr`, `.ui-wrap`, `.ui-avatar`). Racine d'une page migrée : classe `ui-page` (fond, texte, police de la DA ; retire le grain de l'ancien body). Classes : `cx()` de `lib/cx.ts`, pas de clsx.

## Composants (un fichier chacun, export par défaut, props typées)

| Composant | Props principales | Usage |
|---|---|---|
| `Button` | `variant` primary · secondary (défaut) · strong (orange, action secondaire forte) · link ; `size` sm · md · lg ; `href` (next/link ; avec `disabled`, le lien reste en place, `aria-disabled`, hors tabulation, clic annulé) ; en `loading`, « (chargement en cours) » est ajouté au nom ; `loading` ; `disabled` ; `arrow` right · down (link) ; attributs natifs du bouton ou du lien | Un seul `primary` par écran, un seul `strong` par écran. |
| `Card` (+ `CardMedia`, `CardBody`) | `as` ; `padding` none · sm (16) · md (24) ; `href` (seule façon de rendre une carte cliquable : jamais de div cliquable) ; `CardMedia aria-hidden` quand la vignette n'est qu'un mot de remplacement | Fond `--surface`, filet, rayon 16. Survol : un palier de plus, titre `.t-heading` en bleu texte. Jamais d'ombre. |
| `Section` | `title`, `subtitle`, `eyebrow`, `action`, `level` 2 · 3, `spacing` sm · md · lg, `divider`, `contained`, `id`, `as` | En-tête avec action à droite ; `aria-labelledby` automatique sur `section` et `article` (un repère nommé), pas sur `div`. |
| `EmptyState` | `title`, `titleAs`, `children` (phrase concrète), `action`, `icon`, `inline` | Phrase + action, jamais un zéro ni une icône dans un rond. |
| `Badge` | `variant` neutral · new · status ; `tone` brand · neutral | `new` = « Nouveau » orange, un par liste. `status` = point d'état + mot. |
| `Field` | `label`, `type`, `value`/`defaultValue`, `onChange(value)`, `help`, `error`, `multiline`, `rows`, `required` (ajoute « * » au libellé : chaque formulaire porte la légende « * champ obligatoire », dans l'aide ou en tête), `disabled`, `readOnly`, `autoComplete` (dans un vrai formulaire : `email`, `current-password`, `name`, jamais `off`), `inputMode`, `min`/`max`/`step`, `inputClassName` | Erreur = message seul sous le champ (`aria-invalid`, `aria-describedby`), aucun filet rouge. |
| `Skeleton` | `variant` line · avatar · thumb · block ; `width`, `height` | Apparaît après 300 ms ; le parent pose `aria-busy`. |
| `List` / `ListRow` | `List` : `columns` 1 · 2 (deux colonnes dès 672 px de conteneur, jamais plus), `as` (avec `as="div"`, passer `as="div"` aux lignes) ; `ListRow` : `title`, `href`, `eyebrow`, `meta`, `leading`, `trailing`, `selected`, `as`, `titleAs` | Lignes à filets des listes de coachs et de contenus. |
| `Logo` | `href`, `size` sm · md, `label` | « ● ONLYPOK », point `--brand` plat. |

`NumberStepper` et `SelectInput` (antérieurs à D9) sont inchangés ; à aligner sur les tokens lors de la migration de leurs pages.

## Les trois couleurs en dix lignes

1. Charcoal `#21232E` porte tout : fond, surfaces (`--surface`, `--surface-2`, `--surface-3`), filets, ombres. 80 % de l'écran au moins.
2. Le bleu agit : un élément bleu est cliquable ou un état (actif, sélectionné, focus, en cours). Sinon c'est une faute.
3. `--brand` (bleu plein) ne sert qu'en remplissage : bouton primaire (un par écran), point du logo, barre de progression, point d'état. Jamais en texte (2,95:1).
4. `--brand-text` pour les liens d'action, l'onglet actif, le titre survolé, l'anneau de focus et le trait de 2 px d'une ligne sélectionnée (6,19:1 ; le bleu plein ferait 2,73:1 sur la teinte) ; `--brand-soft` pour le fond d'une sélection, toujours doublé d'un indice de forme (trait, coche).
5. Les liens de navigation (nav, footer, menu) restent en `--text-2` : ce sont des repères, pas des actions.
6. L'orange alerte : notification, badge « Nouveau », gain du tracker, verdict juste, une action secondaire forte. Rien d'autre.
7. Deux éléments orange par écran, maximum ; zéro est la norme. Seule exception déclarée : les lignes de gain du tracker.
8. Orange toujours plat et petit : jamais sur du bleu, jamais en grande surface, jamais pour un prix, un lien ou « Gratuit » (ceux-là sont en `--text`).
9. `--error` (rouge désaturé) pour les erreurs de formulaire, les pertes, un verdict raté, les cœurs et carreaux : en texte, jamais en remplissage ni en bordure.
10. Aucune autre teinte, aucun dégradé, aucun halo, aucune bordure colorée hors focus, aucun emoji dans un titre, un bouton ou un libellé. Succès sans urgence = texte neutre + glyphe (« Faite ✓ »).

## Comportements communs

Survol seulement sous `(hover: hover) and (pointer: fine)`, couleur seulement, 150 ms. Appui `scale(.97)` en 100 ms. Focus `2px` `--focus` décalé de 3 px. Cibles tactiles de 44 px au moins : bouton 44 / 48 px, petit bouton 32 px avec une zone de 48 px, lien d'action 48,8 px par padding compensé, ligne de liste 48 px. Un libellé de bouton long revient à la ligne (jamais de défilement horizontal), la hauteur minimale est conservée ; dans une ligne de liste, le titre est coupé après deux lignes (`.clamp2` + `title`), le montant ne l'est jamais. Chiffres en `.num` (tabulaires, zéro barré).

**Mouvement réduit** (`prefers-reduced-motion: reduce`) : fondus de 150 ms au plus, aucune échelle ni translation ; seul `.ui-spinner` boucle. La règle est volontairement limitée aux composants `.ui-*` : la règle globale de la DA §8 (`* { animation: none; transform: none }`) figerait les spinners et casserait les transforms des pages non migrées ; elle sera posée en fin de migration.

**Chargement** : `Skeleton` est `aria-hidden` ; le conteneur pose `aria-busy="true"` et, s'il n'a pas de titre, `aria-label="Chargement"`. `Button loading` bloque le clic et la soumission sans perdre le focus. `color-scheme: dark` est posé sur `:root` ; les iframes (vidéos) restent en `color-scheme: normal` (`styles/tokens.css`).
