import type { SupabaseClient } from '@supabase/supabase-js'

/* Badge « Vérifié » : preuves de résultats RÉELLEMENT validées par un admin, dans les deux catégories
   requises. Logique extraite de app/(student)/formations/page.tsx (D2 §2.1) pour que la landing et la
   marketplace lisent la même source. Sans le filtre `approved`, tout coach devenait vérifié dès l'onboarding. */
export const REQUIRED_PROOF_CATEGORIES: readonly string[] = ['stats', 'longterme']

interface ProofRow {
  coach_id: string
  category: string
}

/** Identifiants des coachs dont les preuves `stats` et `longterme` sont approuvées. Lève l'erreur Supabase : l'appelant décide. */
export async function verifiedCoachIds(supabase: SupabaseClient): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('coach_proofs')
    .select('coach_id, category')
    .in('category', [...REQUIRED_PROOF_CATEGORIES])
    .eq('validation_status', 'approved')
  if (error) throw new Error(`coach_proofs : ${error.message}`)

  const categoriesByCoach = new Map<string, Set<string>>()
  for (const proof of (data ?? []) as ProofRow[]) {
    const categories = categoriesByCoach.get(proof.coach_id) ?? new Set<string>()
    categories.add(proof.category)
    categoriesByCoach.set(proof.coach_id, categories)
  }
  const verified = new Set<string>()
  for (const [coachId, categories] of categoriesByCoach) {
    if (REQUIRED_PROOF_CATEGORIES.every((category) => categories.has(category))) verified.add(coachId)
  }
  return verified
}
