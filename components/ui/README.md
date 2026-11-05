# components/ui — socle de design v2 (D9)

Direction artistique : `.claude/finalisation/design/DIRECTION-ARTISTIQUE.md` (tokens §1.2, contrastes §1.3, règles grep §5). Rendu de référence : `.claude/finalisation/design/planche-composants.html`. Kit vivant, serveur de dev seulement : `/ui-kit` (`app/(dev)/ui-kit`, 404 en production).

Tokens : `styles/tokens.css` (`:root` + `@theme`, importé par `app/globals.css`). Styles des composants : `styles/ui.css` (classes `ui-*` ; aides typographiques `.t-display`, `.t-title`, `.t-heading`, `.t-label`, `.t-caps`, `.t-2`, `.t-3`, `.num`, `.big-num`, `.clamp2`, `.sr`, `.ui-wrap`, `.ui-avatar`). Racine d'une page migrée : classe `ui-page` (fond, texte, police de la DA ; retire le grain de l'ancien body). Classes : `cx()` de `lib/cx.ts`, pas de clsx.

## Composants (un fichier chacun, export par défaut, props typées)

| Composant | Props principales | Usage |
|---|---|---|
| `Button` | `variant` primary · secondary (défaut) · strong (fond forêt, action secondaire forte) · link ; `size` sm · md · lg ; `href` (next/link ; avec `disabled`, le lien reste en place, `aria-disabled`, hors tabulation, clic annulé) ; en `loading`, « (chargement en cours) » est ajouté au nom ; `loading` ; `disabled` ; `arrow` right · down (link) ; attributs natifs du bouton ou du lien | Un seul `primary` par écran, un seul `strong` par écran. |
| `Card` (+ `CardMedia`, `CardBody`) | `as` ; `padding` none · sm (16) · md (24) ; `href` (seule façon de rendre une carte cliquable : jamais de div cliquable) ; `CardMedia aria-hidden` quand la vignette n'est qu'un mot de remplacement | Fond `--surface`, filet, rayon 16. Survol : un palier de plus, titre `.t-heading` en bleu texte. Jamais d'ombre. |
| `Section` | `title`, `subtitle`, `eyebrow`, `action`, `level` 2 · 3, `spacing` sm · md · lg, `divider`, `contained`, `id`, `as` | En-tête avec action à droite ; `aria-labelledby` automatique sur `section` et `article` (un repère nommé), pas sur `div`. |
| `EmptyState` | `title`, `titleAs`, `children` (phrase concrète), `action`, `icon`, `inline` | Phrase + action, jamais un zéro ni une icône dans un rond. |
| `Badge` | `variant` neutral · new · status ; `tone` brand · neutral | `new` = « Nouveau » mousse, un par liste. `status` = point d'état + mot. |
| `Field` | `label`, `type`, `value`/`defaultValue`, `onChange(value)`, `help`, `error`, `multiline`, `rows`, `required` (ajoute « * » au libellé : chaque formulaire porte la légende « * champ obligatoire », dans l'aide ou en tête), `disabled`, `readOnly`, `autoComplete` (dans un vrai formulaire : `email`, `current-password`, `name`, jamais `off`), `inputMode`, `min`/`max`/`step`, `inputClassName` | Erreur = message seul sous le champ (`aria-invalid`, `aria-describedby`), aucun filet rouge. |
| `Skeleton` | `variant` line · avatar · thumb · block ; `width`, `height` | Apparaît après 300 ms ; le parent pose `aria-busy`. |
| `List` / `ListRow` | `List` : `columns` 1 · 2 (deux colonnes dès 672 px de conteneur, jamais plus), `as` (avec `as="div"`, passer `as="div"` aux lignes) ; `ListRow` : `title`, `href`, `eyebrow`, `meta`, `leading`, `trailing`, `selected`, `as`, `titleAs` | Lignes à filets des listes de coachs et de contenus. |
| `Logo` | `href`, `size` sm · md, `label` | « ● ONLYPOK », point `--brand` plat. |

`NumberStepper` et `SelectInput` (antérieurs à D9) sont inchangés ; à aligner sur les tokens lors de la migration de leurs pages.

## Les trois couleurs en dix lignes

1. La base est crème `#EEEDE1`, avec l'encre `#15261C`, le forêt `#1F3D2B`, le caramel `#886429` et le taupe `#A88D70`. Un seul thème ; les panneaux `.on-forest`, `.on-ink`, `.on-caramel`, `.on-taupe` redéfinissent les tokens à l'intérieur, et l'accent passe par `--accent`.
2. `--brand` est le pâle : remplissage du seul bouton plein de l'écran, encre dessus (`--on-brand`). En clair, `--brand` devient la forêt, texte clair dessus.
3. `--brand-text` pour les liens d'action et l'onglet actif, `--focus` pour l'anneau de focus.
4. `--accent` (mousse) pour le badge « Nouveau » et les notifications, texte `--on-accent` dessus.
5. `--gain` (feuille) pour les gains (`.ui-gain`), `--error` (argile) pour les pertes (`.ui-loss`) et les erreurs de formulaire, en texte et contour, jamais en remplissage.
6. Police système partout (`--font-text`, `--font-display`), Unbounded seulement pour le logotype (`--font-logo`). Approche selon la taille : titres serrés, corps à 0 (apple-design §15).
7. `.ui-seg` pour les sélecteurs d'outil (position, profondeur, format), `.num` pour tous les nombres.

## Comportements communs

Survol seulement sous `(hover: hover) and (pointer: fine)`, couleur seulement, 150 ms. Appui `scale(.97)` en 100 ms. Focus `2px` `--focus` décalé de 3 px. Cibles tactiles de 44 px au moins : bouton 44 / 48 px, petit bouton 32 px avec une zone de 48 px, lien d'action 48,8 px par padding compensé, ligne de liste 48 px. Un libellé de bouton long revient à la ligne (jamais de défilement horizontal), la hauteur minimale est conservée ; dans une ligne de liste, le titre est coupé après deux lignes (`.clamp2` + `title`), le montant ne l'est jamais. Chiffres en `.num` (tabulaires, zéro barré).

**Mouvement réduit** (`prefers-reduced-motion: reduce`) : fondus de 150 ms au plus, aucune échelle ni translation ; seul `.ui-spinner` boucle. La règle est volontairement limitée aux composants `.ui-*` : la règle globale de la DA §8 (`* { animation: none; transform: none }`) figerait les spinners et casserait les transforms des pages non migrées ; elle sera posée en fin de migration.

**Chargement** : `Skeleton` est `aria-hidden` ; le conteneur pose `aria-busy="true"` et, s'il n'a pas de titre, `aria-label="Chargement"`. `Button loading` bloque le clic et la soumission sans perdre le focus. `color-scheme: dark` est posé sur `:root` ; les iframes (vidéos) restent en `color-scheme: normal` (`styles/tokens.css`).
