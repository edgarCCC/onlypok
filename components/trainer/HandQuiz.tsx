'use client'
// Quiz de mains : un spot, une décision, le raisonnement. La première question est fixe (même rendu serveur et navigateur), la suite est tirée au sort.
import { useState } from 'react'
import { cx } from '@/lib/cx'
import { QUIZ_QUESTIONS, type QuizAction } from '@/lib/ranges/quiz-questions'
import ToolBar from './ToolBar'
import './trainer.css'

const FAMILY: Partial<Record<QuizAction, string>> = { Raise: 'raise', Jam: 'allin', '3-bet': 'threebet', Call: 'call', Fold: 'fold', Check: 'fold' }

export default function HandQuiz({ backHref = '/trainer' }: { backHref?: string }) {
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<QuizAction | null>(null)
  const [score, setScore] = useState({ correct: 0, total: 0 })

  const question = QUIZ_QUESTIONS[index]
  const answered = selected !== null
  const success = selected === question.correct

  const pick = (action: QuizAction) => {
    if (answered) return
    setSelected(action)
    setScore((s) => ({ correct: s.correct + (action === question.correct ? 1 : 0), total: s.total + 1 }))
  }
  const next = () => {
    let following = index
    while (following === index) following = Math.floor(Math.random() * QUIZ_QUESTIONS.length)
    setIndex(following)
    setSelected(null)
  }

  return (
    <div className="tr">
      <ToolBar
        backHref={backHref}
        title="Quiz de mains"
        actions={score.total > 0 ? (
          <dl className="tr-score tr-score-inline">
            <div><dt>Justes</dt><dd>{score.correct}/{score.total}</dd></div>
            <div><dt>Réussite</dt><dd>{Math.round((score.correct / score.total) * 100)} %</dd></div>
          </dl>
        ) : undefined}
      />
      <div className="qz">
        <p className="qz-meta"><span>{question.position}</span><span>{question.stack.replace('BB', ' bb')}</span><span>{question.difficulty}</span></p>
        <h2 className="qz-hand">{question.hand}{question.board && <span className="qz-board">{question.board}</span>}</h2>
        <p className="qz-action">{question.action}</p>
        <div className="tr-keys" role="group" aria-label="Ta décision">
          {question.options.map((option) => {
            const isCorrect = answered && option === question.correct
            const isWrong = answered && option === selected && !isCorrect
            return (
              <button key={option} type="button" data-fam={FAMILY[option] ?? 'fold'} className={cx('tr-key', isCorrect && 'is-correct', isWrong && 'is-wrong')} aria-disabled={answered} onClick={() => pick(option)}>
                <i aria-hidden="true" />{option}
              </button>
            )
          })}
        </div>
        <div className="qz-answer" aria-live="polite">
          {answered ? (
            <>
              <p><strong className={success ? 'ui-gain' : 'ui-loss'}>{success ? 'Juste.' : `Faux, c’est ${question.correct}.`}</strong> {question.explanation}</p>
              <button type="button" className="ui-btn ui-btn-primary" onClick={next}>Question suivante</button>
            </>
          ) : <p className="t-3">Choisis ta ligne, le raisonnement s’affiche ensuite.</p>}
        </div>
      </div>
    </div>
  )
}
