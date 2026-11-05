/* Les donnes du module d'équité de la landing. Équités exactes, calculées d'avance avec le moteur du trainer :
   rien à calculer dans le navigateur. tests/e2e/equity-deals.spec.ts les revérifie. */
export interface EquityDeal {
  hero: string[]
  villain: string[]
  board: string[]
  /** Équité de la main du joueur, en %. */
  equity: number
  /** Ce qu'il faut retenir, en une phrase. */
  lesson: string
}

export const EQUITY_DEALS: EquityDeal[] = [
  {
    hero: ['As', 'Ks'], villain: ['Qh', 'Qd'], board: [], equity: 46.2,
    lesson: 'Le « coin flip » n’en est pas un : les dames restent devant, même contre As-Roi assorti.',
  },
  {
    hero: ['Qs', 'Js'], villain: ['Ah', 'Ad'], board: ['Ts', '9s', '3d'], equity: 56.3,
    lesson: 'Neuf piques et six cartes de quinte : quinze outs, deux cartes à venir. Ton tirage passe devant les as.',
  },
  {
    hero: ['Ah', 'Qh'], villain: ['Ks', 'Kd'], board: ['Jh', '7h', '2c', '4s'], equity: 27.3,
    lesson: 'Neuf cœurs et trois as : douze outs sur quarante-quatre cartes. Une dame ne te sauve pas, les rois restent devant.',
  },
  {
    hero: ['8d', '8c'], villain: ['As', 'Ks'], board: ['8s', '5s', '2h'], equity: 74.4,
    lesson: 'Ton brelan est loin devant. Neuf piques et deux cartes à venir laissent tout de même une chance sur quatre à As-Roi.',
  },
]
