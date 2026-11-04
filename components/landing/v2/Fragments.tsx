// Fragments d'interface des sections : du vrai HTML, dans les vrais tokens, pas des captures d'écran.
// Aucun pseudo, prix ou titre inventé. Les chiffres du tracker sont marqués « Données d'exemple ». Illustrations : aria-hidden, le titre de la tuile dit tout.
import { cx } from '@/lib/cx'
import type { OpeningRange } from '@/lib/ranges/drill'
import RangeGrid from './RangeGrid'

const POSITIONS = ['LJ', 'HJ', 'CO', 'BTN', 'SB']
const DEPTHS = ['100', '50', '25', '20', '15', '10']

function Seg({ items, on }: { items: string[]; on: string }) {
  return (
    <div className="ui-seg">
      {items.map((item) => <span key={item} className={cx('ui-seg-item', item === on && 'is-on')}>{item}</span>)}
    </div>
  )
}

/** S'entraîner : l'explorateur de ranges, tel qu'il est dans le trainer. */
export function RangeExplorer({ range }: { range: OpeningRange }) {
  return (
    <div className="lp-frag lp-frag-explorer" aria-hidden="true">
      <div className="lp-frag-controls">
        <div><span className="t-caps">Position</span><Seg items={POSITIONS} on="BTN" /></div>
        <div><span className="t-caps">Profondeur (bb)</span><Seg items={DEPTHS} on="100" /></div>
      </div>
      <div className="lp-frag-matrix">
        <RangeGrid range={range} revealed />
        <dl className="lp-frag-stats num">
          <div><dt>Ouvrir</dt><dd>{range.split.in} %</dd></div>
          <div><dt>Frontière</dt><dd>{range.split.border} %</dd></div>
          <div><dt>Passer</dt><dd>{range.split.out} %</dd></div>
        </dl>
      </div>
    </div>
  )
}

/** S'entraîner : le calculateur d'équité (AA contre KK : 82 / 18, résultat classique). */
export function EquityFragment() {
  return (
    <div className="lp-frag" aria-hidden="true">
      <div className="lp-eq-row"><span className="lp-mini-cards"><b>A♠</b><b className="r">A♥</b></span><span className="lp-eq-bar"><i style={{ width: '82%' }} /></span><span className="num lp-eq-v">82 %</span></div>
      <div className="lp-eq-row"><span className="lp-mini-cards"><b className="r">K♦</b><b>K♣</b></span><span className="lp-eq-bar"><i className="dim" style={{ width: '18%' }} /></span><span className="num lp-eq-v">18 %</span></div>
      <p className="lp-frag-note">Main contre main, avec ou sans board. Monte Carlo.</p>
    </div>
  )
}

/** S'entraîner : le quiz de mains. */
export function QuizFragment() {
  return (
    <div className="lp-frag" aria-hidden="true">
      <div className="lp-quiz">
        <span className="lp-mini-cards lg"><b>Q♠</b><b>J♠</b></span>
        <div className="lp-quiz-opts"><span>Fold</span><span>Raise</span></div>
      </div>
      <div className="lp-seg-bar">{Array.from({ length: 10 }, (_, i) => <i key={i} className={i < 6 ? 'on' : ''} />)}</div>
    </div>
  )
}

/** Étudier : le lecteur d'une leçon, avec sa barre de lecture et le plan à côté. */
export function PlayerFragment() {
  return (
    <div className="lp-frag lp-frag-player" aria-hidden="true">
      <div className="lp-player">
        <div className="lp-player-screen"><span className="lp-play"><svg width="14" height="14" viewBox="0 0 14 14"><path d="M3 1.5v11l9-5.5-9-5.5Z" fill="currentColor" /></svg></span></div>
        <div className="lp-player-bar"><span className="num">04:48</span><span className="lp-scrub"><i style={{ width: '40%' }} /></span><span className="num">12:00</span></div>
      </div>
      <ol className="lp-plan">
        <li className="done"><span>Leçon 3</span><span className="num">9 min</span><span className="st">Faite ✓</span></li>
        <li className="now"><span>Leçon 4</span><span className="num">12 min</span><span className="st">En cours</span></li>
        <li><span>Leçon 5</span><span className="num">8 min</span><span className="st" /></li>
        <li><span>Leçon 6</span><span className="num">15 min</span><span className="st" /></li>
      </ol>
    </div>
  )
}

/** Étudier : l'état d'une formation : gratuit d'abord, progression enregistrée. */
export function ProgressFragment() {
  return (
    <div className="lp-frag" aria-hidden="true">
      <div className="lp-progress-top"><span className="big-num num">4 / 10</span><span className="t-caps">leçons</span></div>
      <div className="lp-seg-bar">{Array.from({ length: 10 }, (_, i) => <i key={i} className={i < 3 ? 'on' : i === 3 ? 'half' : ''} />)}</div>
      <p className="lp-frag-note">Tu reprends là où tu t’es arrêté, sur tous tes appareils.</p>
    </div>
  )
}

const DAYS = ['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.']
const HOURS = ['18:00', '19:00', '20:00', '21:00']
// Disponibilités d'exemple : 0 fermé, 1 libre, 2 choisi
const SLOTS = [[1, 0, 1, 1, 0, 0], [1, 1, 0, 1, 1, 1], [0, 1, 1, 2, 1, 1], [0, 1, 1, 1, 0, 1]]

/** Coaching : l'agenda du coach, tel que l'élève le voit pour réserver. */
export function AgendaFragment() {
  return (
    <div className="lp-frag lp-frag-agenda" aria-hidden="true">
      <div className="lp-agenda">
        <span />
        {DAYS.map((day) => <span key={day} className="d">{day}</span>)}
        {HOURS.map((hour, r) => [
          <span key={hour} className="h num">{hour}</span>,
          ...DAYS.map((day, c) => <span key={`${day}-${hour}`} className={cx('s', SLOTS[r][c] === 1 && 'free', SLOTS[r][c] === 2 && 'pick')}>{SLOTS[r][c] === 2 ? hour : null}</span>),
        ])}
      </div>
    </div>
  )
}

/** Coaching : la page de préparation d'une séance. */
export function PrepFragment() {
  return (
    <div className="lp-frag" aria-hidden="true">
      <ul className="lp-prep">
        <li><span className="t-caps">Mes questions</span><span>Défense du big blind face à un 3-bet</span></li>
        <li><span className="t-caps">Mes mains</span><span className="lp-mini-row"><span className="lp-mini-cards"><b>A♠</b><b>5♠</b></span><span className="lp-mini-cards"><b className="r">9♥</b><b className="r">8♥</b></span><span className="lp-mini-cards"><b>K♣</b><b className="r">T♦</b></span></span></li>
        <li><span className="t-caps">Notes du coach</span><span className="t-3">Après la séance, elles restent ici.</span></li>
      </ul>
    </div>
  )
}

// Courbe d'exemple : cumul de sessions, 0 à 2 350 €
const CURVE = [0, 120, 80, 260, 210, 430, 610, 540, 790, 960, 880, 1150, 1340, 1260, 1560, 1720, 1650, 1980, 2140, 2350]
const CURVE_W = 560
const CURVE_H = 150
const curvePoints = CURVE.map((value, i) => `${(i / (CURVE.length - 1)) * CURVE_W},${CURVE_H - (value / 2500) * CURVE_H}`).join(' ')

/** Analyser : la courbe de bankroll du tracker. */
export function BankrollFragment() {
  return (
    <div className="lp-frag lp-frag-bank" aria-hidden="true">
      <div className="lp-bank-top">
        <div><span className="t-caps">Bankroll · 90 jours</span><span className="big-num num gain">+2 350 €</span></div>
        <div className="ui-seg"><span className="ui-seg-item">30 j</span><span className="ui-seg-item is-on">90 j</span><span className="ui-seg-item">Tout</span></div>
      </div>
      <svg className="lp-bank-svg" viewBox={`0 0 ${CURVE_W} ${CURVE_H}`} preserveAspectRatio="none">
        {[0.25, 0.5, 0.75].map((y) => <line key={y} x1="0" x2={CURVE_W} y1={CURVE_H * y} y2={CURVE_H * y} />)}
        <polyline points={curvePoints} />
      </svg>
      <p className="lp-frag-note">Données d’exemple</p>
    </div>
  )
}

const SESSIONS = [
  { room: 'Winamax', format: 'Expresso', hands: '1 240', result: '+312 €', gain: true },
  { room: 'Betclic', format: 'MTT', hands: '860', result: '−84 €', gain: false },
  { room: 'Winamax', format: 'Cash', hands: '2 015', result: '+1 106 €', gain: true },
  { room: 'Winamax', format: 'MTT', hands: '640', result: '−45 €', gain: false },
]

/** Analyser : les sessions importées. */
export function SessionsFragment() {
  return (
    <div className="lp-frag" aria-hidden="true">
      <table className="lp-table num">
        <thead><tr><th>Salle</th><th>Format</th><th>Mains</th><th>Résultat</th></tr></thead>
        <tbody>
          {SESSIONS.map((row) => (
            <tr key={`${row.room}-${row.format}-${row.hands}`}><td>{row.room}</td><td>{row.format}</td><td>{row.hands}</td><td className={row.gain ? 'gain' : 'loss'}>{row.result}</td></tr>
          ))}
        </tbody>
      </table>
      <p className="lp-frag-note">Données d’exemple</p>
    </div>
  )
}
