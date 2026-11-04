/* Les spots du quiz de mains : position, profondeur, décision attendue et raisonnement. */
export type QuizAction = 'Fold' | 'Call' | 'Raise' | '3-bet' | 'Check' | 'Jam'
export type QuizQuestion = {
  position: string
  stack: string
  hand: string
  board?: string
  action: string
  correct: QuizAction
  options: QuizAction[]
  explanation: string
  difficulty: 'Facile' | 'Moyen' | 'Difficile'
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
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
    position: 'HJ', stack: '40BB', hand: 'JJ', action: 'LJ jam all-in.',
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
    explanation: 'AJo vs BTN open depuis le BB : le 3-bet est standard. AJo domine la range de BTN sur beaucoup de mains et permet de prendre l\'initiative même OOP.',
    difficulty: 'Moyen',
  },
]
