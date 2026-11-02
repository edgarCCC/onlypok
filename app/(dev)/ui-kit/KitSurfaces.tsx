import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Card, { CardBody, CardMedia } from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import List from '@/components/ui/List'
import ListRow from '@/components/ui/ListRow'
import Section from '@/components/ui/Section'
import Skeleton from '@/components/ui/Skeleton'
import Figure from './Figure'
import styles from './ui-kit.module.css'

const LONG_TITLE = 'Les fondamentaux du cash game 6-max : ranges, c-bet, 3-bet, sizing et plan de jeu turn/river pour battre NL2 à NL25'

function FormationCard({ className, badge = false }: { className?: string; badge?: boolean }) {
  return (
    <Card as="article" padding="none" href="/formations" className={className}>
      <CardMedia aria-hidden>Formation</CardMedia>
      <CardBody>
        <div className="ui-row-top"><span className="t-caps">Formation · Cash</span>{badge ? <Badge variant="new">Nouveau</Badge> : null}</div>
        <h3 className="t-heading clamp2">Les fondamentaux du cash game 6-max</h3>
        <p className="ui-row-meta num">Lea_Rivers · Débutant · 7 modules</p>
        <div className="ui-row-top" style={{ justifyContent: 'space-between', marginTop: 'var(--space-2)' }}>
          <span className="num" style={{ fontWeight: 600 }}>49 €</span>
          <span className="t-3 t-label num">12 leçons</span>
        </div>
      </CardBody>
    </Card>
  )
}

export default function KitSurfaces() {
  return (
    <>
      <Section title="12 · Carte" subtitle="Surface neutre, aucune couleur par coach. Le survol change le fond d'un palier et le titre en bleu texte ; aucune translation, aucune ombre. Un badge « Nouveau » par liste." divider>
        <div className={`${styles.states} ${styles.wide}`}>
          <Figure label="Repos, avec badge" tokens=".ui-card · --surface · --border · --radius-card" column><FormationCard badge /></Figure>
          <Figure label="Survol" tokens="--surface-2 · --border-strong · titre --brand-text" column><FormationCard className="is-hover" /></Figure>
          <Figure label="Appui" tokens="scale(.97) · 100 ms" column><FormationCard className="is-active" /></Figure>
          <Figure label="Focus clavier" tokens="outline 2px --focus · offset 3px" column><FormationCard className="is-focus" /></Figure>
          <Figure label="Pire cas" tokens="titre 110 car. en 2 lignes + title · vignette absente · prix 4 chiffres" column>
            <Card as="article" padding="none" href="/formations">
              <CardMedia aria-hidden>Formation</CardMedia>
              <CardBody>
                <div className="ui-row-top"><span className="t-caps">Formation</span></div>
                <h3 className="t-heading clamp2" title={LONG_TITLE}>{LONG_TITLE}</h3>
                <p className="ui-row-meta num">Jean-Baptiste_De_La_Fontaine27 · 48 modules</p>
                <div className="ui-row-top" style={{ justifyContent: 'space-between', marginTop: 'var(--space-2)' }}>
                  <span className="num" style={{ fontWeight: 600 }}>9 999 €</span>
                  <span className="t-3 t-label num">0 leçon</span>
                </div>
              </CardBody>
            </Card>
          </Figure>
          <Figure label="Chargement (squelette)" tokens="--surface-2 · rayon du composant · sans reflet · après 300 ms" column>
            <Card as="article" padding="none" aria-busy aria-label="Chargement">
              <Skeleton variant="thumb" />
              <CardBody style={{ gap: 'var(--space-2)' }}>
                <Skeleton width="40%" height={10} />
                <Skeleton width="85%" height={14} />
                <Skeleton width="60%" height={10} />
              </CardBody>
            </Card>
          </Figure>
          <Figure label="Carte de contenu, 16 px" tokens='padding="sm" · dashboards' column>
            <Card><h3 className="t-heading">Ta prochaine séance</h3><p className="t-2">jeu. 31 oct. · <span className="num">20:00</span> · Lea_Rivers</p></Card>
          </Figure>
          <Figure label="Carte de contenu, 24 px" tokens='padding="md" · landing' column>
            <Card padding="md"><h3 className="t-heading">Un coach, un pack, un créneau</h3><p className="t-2">Tu choisis un coach et un pack de séances, tu paies, tu réserves dans son agenda.</p></Card>
          </Figure>
        </div>
      </Section>

      <Section title="13 · Ligne de liste" subtitle="Les listes de coachs et de contenus sont des lignes à filets, jamais une grille de cartes identiques. Sélection : fond bleu à 10 % et trait de 2 px à gauche." divider>
        <div className={`${styles.states} ${styles.wide}`}>
          <Figure label="Lignes : repos, survol, sélectionnée, focus" tokens=".ui-row · titre --brand-text au survol · sélection --brand-soft + trait --brand" column>
            <List aria-label="Coachs, états">
              <ListRow href="/coaches/lea" leading={<span className="ui-avatar" aria-hidden="true">LR</span>} title="Lea_Rivers" meta="Cash · NL25 à NL100 · 4 ans de coaching" trailing={<span className="num">75 €/h</span>} />
              <ListRow href="/coaches/nitro" className="is-hover" leading={<span className="ui-avatar" aria-hidden="true">NF</span>} title="NitroFold" meta="MTT · tables finales" trailing={<span className="num">50 €/h</span>} />
              <ListRow href="/coaches/range" selected leading={<span className="ui-avatar" aria-hidden="true">RW</span>} title="RangeWizard" meta="Cash · ranges et sizing" trailing={<span className="num">120 €/h</span>} />
              <ListRow href="/coaches/tilt" className="is-focus" leading={<span className="ui-avatar" aria-hidden="true">TZ</span>} title="TiltZero" meta="Mental · tilt et routines" trailing={<span className="num">70 €/h</span>} />
            </List>
          </Figure>
          <Figure label="Contenus, deux colonnes dès 768 px" tokens="List columns={2} · eyebrow + Badge new (un par liste) · meta .num" column>
            <List columns={2} aria-label="Contenus récents">
              <ListRow href="/formations/1" eyebrow={<><span className="t-caps">Formation · Cash</span><Badge variant="new">Nouveau</Badge></>} title="Les fondamentaux du cash game 6-max" meta={<span className="num">Lea_Rivers · 7 modules · 49 €</span>} />
              <ListRow href="/formations/2" eyebrow={<span className="t-caps">Vidéo · Heads-Up</span>} title="Heads-up : ranges d’ouverture et sizing" meta={<span className="num">RangeWizard · 38 min · 19 €</span>} />
              <ListRow href="/formations/3" eyebrow={<span className="t-caps">Formation · MTT</span>} title="MTT : jouer les tables finales" meta={<span className="num">TiltZero · 9 modules · 89 €</span>} />
              <ListRow href="/formations/4" eyebrow={<span className="t-caps">Formation · Cash</span>} title="Débuter le poker en ligne" meta={<span className="num">Lea_Rivers · 4 modules · Gratuit</span>} />
            </List>
          </Figure>
          <Figure label="Pire cas" tokens="pseudo de 32 caractères en 2 lignes + title · min-width: 0" column>
            <List aria-label="Coachs, pire cas">
              <ListRow href="/coaches/long" leading={<span className="ui-avatar" aria-hidden="true">JB</span>} title={<span title="Jean-Baptiste_De_La_Fontaine27">Jean-Baptiste_De_La_Fontaine27</span>} meta="Cash NL2000 · PokerStars · session reprise après déconnexion, table 6-max" trailing={<span className="num">1 000 €/h</span>} />
            </List>
          </Figure>
          <Figure label="Chargement (squelette) et liste vide" tokens="avatar 40 px + ligne --surface-2 · après 300 ms · puis phrase + lien" column>
            <List aria-label="Chargement" aria-busy>
              <ListRow titleAs="span" leading={<Skeleton variant="avatar" />} title={<Skeleton width="40%" height={14} />} trailing={<Skeleton width={48} />} />
              <ListRow titleAs="span" leading={<Skeleton variant="avatar" />} title={<Skeleton width="55%" height={14} />} trailing={<Skeleton width={48} />} />
            </List>
            <EmptyState inline action={<Button variant="link" href="/tracker" arrow="right">Importer un fichier Winamax ou Betclic</Button>}>Aucune session pour l’instant.</EmptyState>
          </Figure>
        </div>
      </Section>

      <Section title="14 · Section avec en-tête et action" subtitle="Titre, sous-titre et action alignée à droite ; l'action passe sous le titre quand la place manque." divider>
        <div className={`${styles.states} ${styles.wide}`}>
          <Figure label="Niveau 3, espacement sm" tokens="Section level={3} spacing='sm' action={<Button variant='link'>}" column onSurface>
            <Section level={3} spacing="sm" eyebrow="Agenda" title="Tes prochaines séances" subtitle="Les séances planifiées avec tes coachs." action={<Button variant="link" href="/schedule" arrow="right">Voir l’agenda</Button>}>
              <EmptyState inline action={<Button variant="link" href="/coaches" arrow="right">Réserver une séance</Button>}>Aucune séance planifiée.</EmptyState>
            </Section>
          </Figure>
          <Figure label="Squelettes" tokens="line 12 px · avatar 40 px · thumb 16/9 · block 48 px" column>
            <Skeleton width="60%" />
            <Skeleton variant="avatar" />
            <Skeleton variant="thumb" style={{ maxWidth: 160 }} />
            <Skeleton variant="block" />
          </Figure>
        </div>
      </Section>

      <Section title="15 · Mouvement" divider>
        <ul className={styles.rules}>
          <li>Appui : scale(.97), 100 ms --ease-out, retour 160 ms, sur tout pressable (bouton, carte cliquable).</li>
          <li>Survol : couleur seulement, 150 ms ease, sous (hover: hover) and (pointer: fine). Liens : soulignement, sans transition.</li>
          <li>Menus et popovers (à venir) : 180 ms entrée / 120 ms sortie, depuis le déclencheur, scale(.97) et opacité, transitions interruptibles.</li>
          <li>Aucune boucle hors .ui-spinner ; aucune entrée au scroll ; aucune animation sur une action au clavier.</li>
          <li>Mouvement réduit : fondus de 150 ms au plus, aucune translation ni échelle ; le spinner reste actif (16 px).</li>
          <li>Squelette : après 300 ms d’attente, jamais avant ; sans reflet.</li>
        </ul>
      </Section>
    </>
  )
}
