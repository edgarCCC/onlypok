import Button, { type ButtonVariant } from '@/components/ui/Button'
import Section from '@/components/ui/Section'
import Figure from './Figure'
import styles from './ui-kit.module.css'

const STATES = [
  { label: 'Repos', props: {} },
  { label: 'Survol (pointeur fin)', props: { className: 'is-hover' } },
  { label: 'Appui', props: { className: 'is-active' } },
  { label: 'Focus clavier', props: { className: 'is-focus' } },
  { label: 'Désactivé', props: { disabled: true } },
  { label: 'Chargement', props: { loading: true } },
] as const

const TOKENS: Record<Exclude<ButtonVariant, 'link'>, string[]> = {
  primary: ['--brand · --on-brand · --radius-control', '--brand-hover · 150 ms ease', 'scale(.97) · 100 ms --ease-out · retour 160 ms', 'outline 2px --focus · offset 3px', '--surface-3 · --text-disabled (exempté) · not-allowed', '.ui-spinner currentColor · 700 ms linear · aria-busy'],
  secondary: ['--border-strong · --text', '--surface-2 · filet --text-3', 'scale(.97) · 100 ms', 'outline 2px --focus', '--border · --text-disabled', '.ui-spinner · aria-busy'],
  strong: ['--border-strong · libellé --accent 600 (6,4:1)', '--surface-2', 'scale(.97) · 100 ms', 'outline 2px --focus', '--border · --text-disabled', '.ui-spinner · aria-busy'],
}

function ButtonStates({ variant, label }: { variant: Exclude<ButtonVariant, 'link'>; label: string }) {
  return (
    <div className={styles.states}>
      {STATES.map((state, index) => (
        <Figure key={state.label} label={state.label} tokens={TOKENS[variant][index]}>
          <Button variant={variant} {...state.props}>{state.props && 'loading' in state.props ? `${label}…` : label}</Button>
        </Figure>
      ))}
    </div>
  )
}

export default function KitButtons() {
  return (
    <>
      <Section title="5 · Bouton primaire (bleu)" subtitle="Un seul par écran. Plat, texte --on-brand (4,9:1). Le survol est discret par construction : au-delà de #1C62FF, le texte perd AA. Le retour principal est l'appui." divider>
        <ButtonStates variant="primary" label="Créer mon compte" />
      </Section>

      <Section title="6 · Bouton secondaire (contour)" subtitle="Tout ce qui n'est pas l'action principale de l'écran : « Devenir coach », « Fold / Raise », « Ouvrir le trainer » dans un état vide." divider>
        <ButtonStates variant="secondary" label="Devenir coach" />
      </Section>

      <Section title="7 · Action secondaire forte (orange)" subtitle="Une par écran, quand elle est l'urgence du jour : « Accepter la demande » sur l'accueil coach. Contour neutre, libellé orange, jamais de remplissage orange." divider>
        <ButtonStates variant="strong" label="Accepter la demande" />
      </Section>

      <Section title="8 · Lien d'action, tailles, lien rendu comme bouton" subtitle="Le bleu texte dit « tu peux agir ici ». Survol : soulignement, sans transition. Les liens de navigation restent neutres : ce sont des repères, pas des actions." divider>
        <div className={styles.states}>
          <Figure label="Lien d'action, repos" tokens="--brand-text (6,7:1) · 16 px / 1,55 · zone de clic 48,8 px par padding (≥ 44)"><Button variant="link" href="/formations" arrow="right">Voir les formations</Button></Figure>
          <Figure label="Survol" tokens="soulignement, sans transition"><Button variant="link" href="/formations" arrow="right" className="is-hover">Voir les formations</Button></Figure>
          <Figure label="Focus clavier" tokens="outline 2px --focus"><Button variant="link" href="/formations" arrow="right" className="is-focus">Voir les formations</Button></Figure>
          <Figure label="Flèche vers le bas" tokens='arrow="down"'><Button variant="link" href="#exercice" arrow="down">Essayer le trainer</Button></Figure>
          <Figure label="Lien d'action désactivé" tokens="--text-disabled · aria-disabled · hors tabulation · inerte"><Button variant="link" href="/formations" arrow="right" disabled>Voir les formations</Button></Figure>
          <Figure label="Petit, 32 px" tokens=".ui-btn-sm · zone tactile 48 px"><Button size="sm">Modifier</Button></Figure>
          <Figure label="Moyen, 44 px (défaut)" tokens=".ui-btn"><Button>Modifier</Button></Figure>
          <Figure label="Grand, 48 px" tokens=".ui-btn-lg · hero et CTA final"><Button variant="primary" size="lg" href="/register">Créer mon compte</Button></Figure>
          <Figure label="Lien désactivé, primaire" tokens="href + disabled · aria-disabled · tabIndex -1 · pointer-events none · --surface-3"><Button variant="primary" href="/register" disabled>Créer mon compte</Button></Figure>
          <Figure label="Lien désactivé, secondaire et forte" tokens="--border · --text-disabled"><Button href="/become-coach" disabled>Devenir coach</Button><Button variant="strong" href="/coach/requests" disabled>Accepter</Button></Figure>
          <Figure label="Pire cas, 49 caractères" tokens="retour à la ligne · min-height 44 · 0 défilement à 320 px" column><Button variant="primary">Réserver la séance de jeudi 20:00 avec Lea_Rivers</Button></Figure>
          <Figure label="Pire cas, 64 caractères" tokens="retour à la ligne, 3 lignes à 320 px · hauteur minimale conservée" column><Button>Importer un fichier Winamax ou Betclic et recalculer la bankroll</Button></Figure>
        </div>
      </Section>
    </>
  )
}
