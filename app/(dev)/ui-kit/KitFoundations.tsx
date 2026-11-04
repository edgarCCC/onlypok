import Logo from '@/components/ui/Logo'
import Section from '@/components/ui/Section'
import Figure from './Figure'
import styles from './ui-kit.module.css'

const SWATCHES = [
  { token: '--bg', value: '#0F1F17', note: 'encre : le fond' },
  { token: '--surface', value: '#162B21', note: 'carte, panneau' },
  { token: '--surface-2', value: '#1E3A2E', note: 'forêt : champ, élevé' },
  { token: '--surface-3', value: '#2E4A36', note: 'survol, actif' },
  { token: '--text', value: '#EAEBE4', note: '14,2:1 sur le fond' },
  { token: '--text-2', value: '#C7CBB8', note: 'pâle : 10,3:1' },
  { token: '--text-3', value: '#9EA994', note: '7,0:1 ; 5,0:1 sur la forêt' },
  { token: '--brand', value: '#C7CBB8', note: 'bouton plein ; encre dessus 10,3:1' },
  { token: '--brand-hover', value: '#D5D8CA', note: 'survol du bouton plein' },
  { token: '--accent', value: '#3E5A3F', note: 'mousse : badge ; pâle dessus 4,6:1' },
  { token: '--sage', value: '#6B7F67', note: 'sauge : barres, graphiques (pas de texte)' },
  { token: '--olive', value: '#3D4337', note: 'olive : neutre chaud' },
  { token: '--gain', value: '#9CCB8E', note: 'gains : 9,2:1' },
  { token: '--error', value: '#E39A87', note: 'erreur et pertes : 7,5:1' },
]

export default function KitFoundations() {
  return (
    <>
      <Section title="1 · Couleurs et contrastes" subtitle="Trois couleurs et leurs dérivés. Ratios WCAG mesurés sur --bg, détail sur les quatre surfaces dans la DA §1.3." divider>
        <div className={styles.swatches}>
          {SWATCHES.map((swatch) => (
            <figure key={swatch.token} className={styles.figure}>
              <i className={styles.swatch} style={{ background: `var(${swatch.token})` }} aria-hidden="true" />
              <figcaption className={styles.caption}>
                <b>{swatch.token}</b>
                <code>{swatch.value}</code>
                <span>{swatch.note}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </Section>

      <Section title="2 · Pile de surfaces" subtitle="La profondeur vient de l'empilement et d'un filet par palier. Une seule ombre, neutre et faible, sur ce qui flotte." divider>
        <div className={`${styles.states} ${styles.wide}`}>
          <figure className={styles.figure}>
            <div className={styles.stack}>
              <div className={styles.levelLabel}><span>--bg · page</span><code>#0F1F17</code></div>
              <div className={styles.level} style={{ background: 'var(--surface)' }}>
                <div className={styles.levelLabel}><span>--surface · carte</span><code>#282A36</code></div>
                <div className={styles.level} style={{ background: 'var(--surface-2)' }}>
                  <div className={styles.levelLabel}><span>--surface-2 · champ, vignette</span><code>#30323D</code></div>
                  <div className={styles.level} style={{ background: 'var(--surface-3)' }}>
                    <div className={styles.levelLabel} style={{ margin: 0 }}><span>--surface-3 · appui, carte à jouer</span><code>#383A45</code></div>
                  </div>
                </div>
              </div>
            </div>
            <figcaption className={styles.caption}><b>Quatre paliers, un filet chacun</b><code>--border : texte à 8 %</code></figcaption>
          </figure>
          <Figure label="Ce qui flotte" tokens="--surface · --shadow-float" onSurface className={styles.float}>
            <span className="t-2">Menu, popover, modale</span>
          </Figure>
        </div>
      </Section>

      <Section title="3 · Typographie, cinq niveaux" subtitle="Unbounded 600 / 700 à partir de 24 px, Space Grotesk 400 / 500 / 600 pour le reste et tous les chiffres (tabulaires)." divider>
        <div className={styles.typo}>
          <div><span className="t-display">Apprends à décider.</span><code>1 · Display · Unbounded 700 · 32 → 56 px · 1,04 · −0,035 em</code></div>
          <div><span className="t-title">Trois façons de travailler.</span><code>2 · Titre · Unbounded 600 · 24 → 32 px · 1,12 · −0,025 em</code></div>
          <div><span className="t-heading">Les fondamentaux du cash game 6-max</span><code>3 · Intertitre · Space Grotesk 600 · 18 px · 1,3 · −0,01 em</code></div>
          <div><span>Tu choisis un coach et un pack de séances, tu paies, tu réserves dans son agenda.</span><code>4 · Corps · Space Grotesk 400 · 16 px · 1,55</code></div>
          <div>
            <span className="t-label t-2">jeu. 31 oct. · <span className="num">20:00</span> · Planifiée &nbsp;&nbsp; <span className="t-caps">BTN · 100 bb · 6-max</span></span>
            <code>5 · Libellé · 500 · 13 px ; capitales 600 · 11 px · +0,06 em</code>
          </div>
          <div><span className="big-num">1 240,00 €</span><code>Grand chiffre · Space Grotesk 600 · taille du niveau 2 · tabular-nums</code></div>
        </div>
      </Section>

      <Section title="4 · Logo" subtitle="Point de 7 × 7 px, rayon 2, pâle à plat ; plus de dégradé, plus de cyan. Le point seul sert de favicon." divider>
        <div className={styles.states}>
          <Figure label="Header, 15 px" tokens=".ui-logo · --brand · Unbounded 700 · +0,18 em"><Logo /></Figure>
          <Figure label="Header coach et pied de page, 13 px" tokens=".ui-logo-sm"><Logo size="sm" href="/coach/dashboard" label="OnlyPok, accueil coach" /></Figure>
        </div>
      </Section>
    </>
  )
}
