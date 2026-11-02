/**
 * Concatène des classes CSS en ignorant les valeurs vides, false, null et undefined.
 * Remplace clsx sans ajouter de dépendance (socle de design D9).
 */
export type ClassValue = string | false | null | undefined

export function cx(...values: ClassValue[]): string {
  let out = ''
  for (const value of values) {
    if (value) out = out ? `${out} ${value}` : value
  }
  return out
}
