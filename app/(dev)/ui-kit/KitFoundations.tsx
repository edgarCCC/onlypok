import Logo from '@/components/ui/Logo'
import Section from '@/components/ui/Section'
import Figure from './Figure'
import styles from './ui-kit.module.css'

const SWATCHES = [
  { token: '--bg', value: '#21232E', note: 'fond, L* 14' },
  { token: '--surface', value: '#282A36', note: 'cartes, L* 17' },
  { token: '--surface-2', value: '#30323D', note: 'champs, survol, L* 21' },
  { token: '--surface-3', value: '#383A45', note: 'appui, désactivé, L* 25' },
  { token: '--text', value: '#E8EBF5', note: '13,1:1' },
  { token: '--text-2', value: 'texte à 80 %', note: '8,9:1 (6,7 sur surface-3)' },
  { token: '--text-3', value: 'texte à 60 %', note: '5,6:1 (4,6 sur surface-3)' },
  { token: '--border-input', value: 'texte à 40 %', note: 'filet des champs, 3,06:1' },
  { token: '--brand', value: '#105BFF', note: 'remplissage ; en texte 2,9:1, interdit' },
  { token: '--brand-hover', value: '#1C62FF', note: 'on-brand dessus 4,6:1' },
  { token: '--brand-text', value: '#7DA9FF', note: 'liens, focus : 6,7:1' },
  { token: '--brand-soft', value: 'bleu à 10 %', note: 'sélection' },
  { token: '--accent', value: '#FE8500', note: '6,4:1 ; charcoal dessus 6,4:1' },
  { token: '--error', value: '#E88F88', note: '6,5:1 (4,7 sur surface-3)' },
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
              <div className={styles.levelLabel}><span>--bg · page</span><code>#21232E</code></div>
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

      <Section title="4 · Logo" subtitle="Point de 7 × 7 px, rayon 2, bleu plat ; plus de dégradé, plus de cyan. Le point seul sert de favicon." divider>
        <div className={styles.states}>
          <Figure label="Header, 15 px" tokens=".ui-logo · --brand · Unbounded 700 · +0,18 em"><Logo /></Figure>
          <Figure label="Header coach et pied de page, 13 px" tokens=".ui-logo-sm"><Logo size="sm" href="/coach/dashboard" label="OnlyPok, accueil coach" /></Figure>
        </div>
      </Section>
    </>
  )
}
