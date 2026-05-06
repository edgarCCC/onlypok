'use client'
import Navbar from '@/components/landing/Navbar'
import Link from 'next/link'
import { useState } from 'react'
import { ArrowLeft, RefreshCw, Check, X } from 'lucide-react'

const CREAM  = '#f0f4ff'
const SILVER = 'rgba(240,244,255,0.45)'
const BORDER = 'rgba(232,228,220,0.08)'
const CARD   = 'rgba(232,228,220,0.03)'

type Action = 'Fold' | 'Call' | 'Raise' | '3-bet' | 'Check' | 'Jam'
type Question = {
  position: string
  stack: string
  hand: string
  board?: string
  action: string
  correct: Action
  options: Action[]
  explanation: string
  difficulty: 'Facile' | 'Moyen' | 'Difficile'
}

const QUESTIONS: Question[] = [
  {
    position: 'LJ', stack: '100BB', hand: 'AA', action: 'Première action — aucun joueur n\'a agi',
    correct: 'Raise', options: ['Fold', 'Call', 'Raise'],
    explanation: 'AA est la meilleure main. On open raise toujours — limp serait une erreur coûteuse qui laisse les blindes voir le flop gratuitement.',
    difficulty: 'Facile',
  },
  {
    position: 'BTN', stack: '100BB', hand: 'KJo', action: 'LJ open 3BB. Fold de tout le monde jusqu\'au BTN.',
    correct: 'Call', options: ['Fold', 'Call', '3-bet'],
    explanation: 'KJo est trop fort pour folder vs LJ mais trop faible pour 3-bet en fréquence élevée. Call en position est la ligne équilibrée.',
    difficulty: 'Moyen',
  },
  {
    position: 'BB', stack: '100BB', hand: '72o', action: 'BTN open 2.5BB. SB fold.',
    correct: 'Fold', options: ['Fold', 'Call', '3-bet'],
    explanation: '7-2 offsuit est la pire main au poker. Même avec un discount, c\'est un fold clair face à un open bouton.',
    difficulty: 'Facile',
  },
  {
    position: 'SB', stack: '100BB', hand: 'AKs', action: 'BTN open 2.5BB.',
    correct: '3-bet', options: ['Fold', 'Call', '3-bet'],
    explanation: 'AKs est une 3-bet de valeur standard depuis le SB vs le BTN. La position désavantageuse justifie d\'agrandir le pot en faveur quand on est favori.',
    difficulty: 'Facile',
  },
  {
    position: 'LJ+1', stack: '40BB', hand: 'JJ', action: 'LJ jam all-in.',
    correct: 'Call', options: ['Fold', 'Call'],
    explanation: 'JJ vs une range LJ 40BB est un call rentable. La range d\'LJ contient suffisamment de mains dominées (TT-77, AQs, AJs, KQs) pour que JJ soit favori.',
    difficulty: 'Moyen',
  },
  {
    position: 'CO', stack: '100BB', hand: 'A5s', action: 'LJ open 3BB. MP call.',
    correct: 'Fold', options: ['Fold', 'Call', '3-bet'],
    explanation: 'A5s est trop faible pour call avec 2 joueurs actifs devant. On perd notre position relative et l\'équité est insuffisante pour appeler 3BB multi-way.',
    difficulty: 'Moyen',
  },
  {
    position: 'BTN', stack: '100BB', hand: 'T9s', action: 'LJ open 3BB. Fold de tout le monde.',
    correct: 'Call', options: ['Fold', 'Call', '3-bet'],
    explanation: 'T9s en position est un call standard — bonne équité réalisable, nutflush draws, straights. 3-bet est possible en fréquence mais trop linéaire.',
    difficulty: 'Moyen',
  },
  {
    position: 'HJ', stack: '20BB', hand: 'QQ', action: 'Fold de tout le monde jusqu\'à Hero.',
    correct: 'Jam', options: ['Fold', 'Raise', 'Jam'],
    explanation: 'QQ à 20BB est trop fort pour open/fold, et un open standard casse ton stack si tu call ensuite. Jam push for value — simple et efficace.',
    difficulty: 'Facile',
  },
  {
    position: 'BB', stack: '100BB', hand: 'KQo', board: 'K♠ 7♥ 2♦', action: 'CO bet 1/3 pot.',
    correct: 'Raise', options: ['Fold', 'Call', 'Raise'],
    explanation: 'Top pair top kicker sur un board sec. Raise pour protéger contre les tirages et construire le pot avec la meilleure main.',
    difficulty: 'Moyen',
  },
  {
    position: 'BTN', stack: '100BB', hand: 'A2s', board: 'A♥ J♠ 5♣', action: 'BB check. Hero ?',
    correct: 'Check', options: ['Check', 'Raise'],
    explanation: 'A2 avec une kicker faible sur un board AJ5 — check/call est correct. Le BB peut avoir AJ, AQ, sets. Pas besoin de construire le pot avec une main vulnérable.',
    difficulty: 'Difficile',
  },
  {
    position: 'CO', stack: '100BB', hand: '88', action: 'LJ open 3BB. MP 3-bet 9BB.',
    correct: 'Fold', options: ['Fold', 'Call', 'Jam'],
    explanation: '88 vs un 3-bet LJ/MP est souvent un fold. Tu es rarement favori et jouer OOP vs une range forte avec un set mining EV médiocre (pas de depth de stacks suffisant ici).',
    difficulty: 'Difficile',
  },
  {
    position: 'BB', stack: '100BB', hand: 'AJo', action: 'BTN open 2.5BB. SB fold.',
    correct: '3-bet', options: ['Fold', 'Call', '3-bet'],
    explanation: 'AJo vs BTN open depuis le BB : 3-bet is standard. AJo domine la range de BTN sur beaucoup de mains et permet de prendre l\'initiative même OOP.',
    difficulty: 'Moyen',
  },
]

const DIFF_COLORS: Record<string, string> = {
  Facile: '#4ade80', Moyen: '#f59e0b', Difficile: '#ef4444',
}

export default function QuizPage() {
  const [idx,      setIdx]      = useState(() => Math.floor(Math.random() * QUESTIONS.length))
  const [selected, setSelected] = useState<Action | null>(null)
  const [score,    setScore]    = useState({ correct: 0, total: 0 })

  const q = QUESTIONS[idx]
  const answered = selected !== null

  const pick = (a: Action) => {
    if (answered) return
    setSelected(a)
    setScore(s => ({ correct: s.correct + (a === q.correct ? 1 : 0), total: s.total + 1 }))
  }

  const next = () => {
    setIdx(Math.floor(Math.random() * QUESTIONS.length))
    setSelected(null)
  }

  const accuracy = score.total > 0 ? Math.round((score.correct / score.total) * 100) : null

  return (
    <div style={{ minHeight: '100vh', background: '#07090e', color: CREAM }}>
      <Navbar />
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '100px 24px 80px' }}>

        <Link href="/trainer" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, color: SILVER, textDecoration: 'none', fontSize: 13, marginBottom: 32 }}>
          <ArrowLeft size={14} /> Retour au Trainer
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px', margin: '0 0 4px' }}>Quiz de Mains</h1>
            <p style={{ fontSize: 13, color: SILVER, margin: 0 }}>Quelle est la bonne action ?</p>
          </div>
          {score.total > 0 && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: accuracy! >= 70 ? '#4ade80' : accuracy! >= 50 ? '#f59e0b' : '#ef4444' }}>
                {accuracy}%
              </div>
              <div style={{ fontSize: 11, color: SILVER }}>{score.correct}/{score.total}</div>
            </div>
          )}
        </div>

        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 20, padding: '32px 28px', marginBottom: 16 }}>
          {/* Badges */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: 'rgba(124,58,237,0.12)', color: '#a78bfa', border: '1px solid rgba(124,58,237,0.2)' }}>
              {q.position}
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: 'rgba(255,255,255,0.04)', color: SILVER, border: `1px solid ${BORDER}` }}>
              {q.stack}
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: `${DIFF_COLORS[q.difficulty]}12`, color: DIFF_COLORS[q.difficulty], border: `1px solid ${DIFF_COLORS[q.difficulty]}30` }}>
              {q.difficulty}
            </span>
          </div>

          {/* Hand */}
          <div style={{ background: 'rgba(124,58,237,0.08)', borderRadius: 12, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 11, color: SILVER, fontWeight: 600 }}>TA MAIN</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: '#a78bfa', fontFamily: 'monospace' }}>{q.hand}</span>
            {q.board && <><span style={{ color: SILVER, fontSize: 11 }}>BOARD</span><span style={{ fontSize: 15, fontWeight: 700, color: CREAM }}>{q.board}</span></>}
          </div>

          {/* Scenario */}
          <p style={{ fontSize: 14, color: CREAM, lineHeight: 1.6, margin: '0 0 28px' }}>{q.action}</p>

          {/* Options */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: answered ? 20 : 0 }}>
            {q.options.map(opt => {
              const isSelected = selected === opt
              const isCorrect  = opt === q.correct
              let bg = 'rgba(255,255,255,0.04)'
              let border = BORDER
              let color = CREAM
              if (answered) {
                if (isCorrect) { bg = 'rgba(74,222,128,0.1)'; border = 'rgba(74,222,128,0.4)'; color = '#4ade80' }
                else if (isSelected && !isCorrect) { bg = 'rgba(239,68,68,0.1)'; border = 'rgba(239,68,68,0.4)'; color = '#ef4444' }
              }
              return (
                <button key={opt} onClick={() => pick(opt)} style={{ flex: 1, minWidth: 100, padding: '12px 16px', borderRadius: 10, border: `1px solid ${border}`, background: bg, color, fontSize: 14, fontWeight: 700, cursor: answered ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.15s' }}>
                  {answered && isCorrect && <Check size={14} />}
                  {answered && isSelected && !isCorrect && <X size={14} />}
                  {opt}
                </button>
              )
            })}
          </div>

          {/* Explanation */}
          {answered && (
            <div style={{ borderRadius: 12, padding: '16px', background: q.correct === selected ? 'rgba(74,222,128,0.06)' : 'rgba(124,58,237,0.06)', border: `1px solid ${q.correct === selected ? 'rgba(74,222,128,0.2)' : 'rgba(124,58,237,0.2)'}`, marginBottom: 16 }}>
              <p style={{ fontSize: 13, color: SILVER, margin: 0, lineHeight: 1.6 }}>
                <strong style={{ color: CREAM }}>Explication :</strong> {q.explanation}
              </p>
            </div>
          )}

          {answered && (
            <button onClick={next} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px', borderRadius: 10, border: 'none', background: '#7c3aed', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              <RefreshCw size={14} /> Question suivante
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
