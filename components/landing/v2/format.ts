/* Formats de la landing (fr-FR) : espaces insécables, pluriels, montants. Aucun chiffre inventé : ce qui est formaté vient de la base. */

const NARROW_NBSP = ' '
const numberFormat = new Intl.NumberFormat('fr-FR')

export function formatInt(value: number): string {
  return numberFormat.format(value)
}

/** « 1 formation », « 12 formations », « 30 formations et vidéos ». */
export function plural(count: number, singular: string, pluralForm: string = `${singular}s`): string {
  return `${numberFormat.format(count)} ${count > 1 ? pluralForm : singular}`
}

/** Prix d'un contenu : « Gratuit » à 0, sinon « 9 999 € ». */
export function eur(amount: number): string {
  return amount === 0 ? 'Gratuit' : `${numberFormat.format(amount)}${NARROW_NBSP}€`
}

/** Tarif horaire d'un coach : rien s'il n'est pas renseigné, « Gratuit » à 0, sinon « 75 €/h ». */
export function hourlyRate(rate: number | null): string | null {
  if (rate === null) return null
  return rate === 0 ? 'Gratuit' : `${numberFormat.format(rate)}${NARROW_NBSP}€/h`
}

/** Années d'expérience : « moins d’un an d’exp. » sous 1, sinon « 6 ans d’exp. ». */
export function experience(years: number | null): string | null {
  if (years === null) return null
  if (years < 1) return 'moins d’un an d’exp.'
  return `${plural(years, 'an')} d’exp.`
}

function firstGrapheme(text: string): string {
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const first = new Intl.Segmenter('fr', { granularity: 'grapheme' }).segment(text)[Symbol.iterator]().next()
    return first.done ? '' : first.value.segment
  }
  return Array.from(text)[0] ?? ''
}

/** Initiales par graphème (jamais slice(0, 2), qui coupe un emoji en deux) : « Lea_Rivers » → « LR », un pseudo commençant par un emoji garde l'emoji entier. */
export function initials(name: string | null | undefined): string {
  const parts = (name ?? '').trim().split(/[\s_-]+/).filter(Boolean)
  if (!parts.length) return 'C'
  const first = firstGrapheme(parts[0])
  const last = parts.length > 1 ? firstGrapheme(parts[parts.length - 1]) : ''
  return `${first}${last}`.toUpperCase()
}
