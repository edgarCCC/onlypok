import { CalendarDays } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import Field from '@/components/ui/Field'
import Section from '@/components/ui/Section'
import Figure from './Figure'
import styles from './ui-kit.module.css'

export default function KitForms() {
  return (
    <>
      <Section title="9 · Champ de formulaire" subtitle="Identifié par son remplissage --surface-2, son libellé, son filet à 40 % (3,06:1) et l'anneau de focus. L'erreur est une phrase concrète sous le champ, sans filet rouge." divider>
        <div className={styles.states}>
          <Figure label="Repos" tokens="--surface-2 · --border-input · placeholder --text-3 · aide --text-3">
            <Field label="Adresse email" type="email" placeholder="toi@exemple.fr" autoComplete="off" required help="On t'envoie un lien de connexion. * champ obligatoire" />
          </Figure>
          <Figure label="Survol" tokens="filet --text-3 · 150 ms">
            <Field label="Adresse email" type="email" placeholder="toi@exemple.fr" autoComplete="off" inputClassName="is-hover" />
          </Figure>
          <Figure label="Focus" tokens="outline 2px --focus · offset 3px · valeur --text">
            <Field label="Adresse email" type="email" defaultValue="edgar@exemple.fr" autoComplete="off" inputClassName="is-focus" />
          </Figure>
          <Figure label="Erreur" tokens="message --error · aria-invalid · aria-describedby · filet inchangé">
            <Field label="Adresse email" type="email" defaultValue="edgar@exemple" autoComplete="off" error="L’adresse email n’est pas valide." />
          </Figure>
          <Figure label="Désactivé" tokens="--surface · --border · --text-disabled · not-allowed">
            <Field label="Adresse email" type="email" defaultValue="edgar@exemple.fr" disabled help="Modifiable depuis ton profil." />
          </Figure>
          <Figure label="Zone de texte" tokens="textarea.ui-input · 96 px · redimensionnable">
            <Field label="Tes questions pour la séance" multiline rows={3} placeholder="Les mains que tu veux revoir, les spots qui te posent problème…" />
          </Figure>
        </div>
      </Section>

      <Section title="10 · Badge et point d'état" subtitle="Le badge « Nouveau » est un usage canonique de la mousse : un par liste, texte charcoal sur orange (6,4:1). Les états se lisent par le mot ; le point double l'information." divider>
        <div className={styles.states}>
          <Figure label="Neutre" tokens=".ui-badge · --border-strong · --text-2 · capitales 11 px"><Badge>Cash</Badge><Badge>MTT</Badge></Figure>
          <Figure label="Nouveau" tokens=".ui-badge-new · --accent · --on-accent"><Badge variant="new">Nouveau</Badge></Figure>
          <Figure label="Dans une ligne, à côté du type" tokens="jamais sur la vignette" onSurface><span className="t-caps">Formation · Cash</span><Badge variant="new">Nouveau</Badge></Figure>
          <Figure label="Point d'état, planifié" tokens=".ui-badge-status · .ui-dot --brand"><Badge variant="status">Planifiée</Badge></Figure>
          <Figure label="Point d'état, neutre" tokens=".ui-dot-neutral --text-3"><Badge variant="status" tone="neutral">Annulée</Badge></Figure>
          <Figure label="Fait, vérifié : texte et glyphe" tokens="--text · aucune couleur"><span className="t-label">Faite ✓</span><span className="t-label t-2">Vérifié ✓</span></Figure>
        </div>
      </Section>

      <Section title="11 · État vide" subtitle="Une phrase concrète et une action. Pas d'icône dans un rond, pas d'illustration, pas de compteur à zéro." divider>
        <div className={`${styles.states} ${styles.wide}`}>
          <Figure label="Section vide" tokens=".ui-empty · --surface · --border · --radius-card · bouton secondaire" column>
            <EmptyState title="Aucune formation pour l’instant" action={<Button href="/trainer">Ouvrir le trainer</Button>}>
              Les coachs publient leurs premiers cours. En attendant, le trainer est ouvert, sans compte.
            </EmptyState>
          </Figure>
          <Figure label="Liste vide, en ligne" tokens=".ui-empty-inline · --text-2 · lien d'action --brand-text" column>
            <EmptyState inline action={<Button variant="link" href="/coaches" arrow="right">Réserver une séance</Button>}>
              Aucune séance planifiée.
            </EmptyState>
          </Figure>
          <Figure label="Avec une icône nue, lien d'action" tokens="icon · phrase + lien, pas de rond, pas de 0" column>
            <EmptyState title="Aucune demande à valider" icon={<CalendarDays size={20} aria-hidden="true" />} action={<Button variant="link" href="/coach/agenda" arrow="right">Ouvrir mon agenda</Button>}>
              Tes élèves réservent dans ton agenda ; tu verras leurs demandes ici.
            </EmptyState>
          </Figure>
        </div>
      </Section>
    </>
  )
}
