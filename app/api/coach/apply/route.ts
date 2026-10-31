import { NextRequest, NextResponse } from 'next/server'
import type { PostgrestError, SupabaseClient, User } from '@supabase/supabase-js'
import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabase/server'
import { rateLimit, tooManyRequests } from '@/lib/rate-limit'
import { boolean, object, optional, readJsonBody } from '@/lib/validate'

/**
 * POST /api/coach/apply — un élève connecté devient coach après avoir accepté
 * les conditions coach (tâche N3, ARCHI-NAVIGATION §3.3 / §5.4).
 *
 * Seule voie autorisée pour passer `role` à 'coach' : plus aucun update du
 * rôle depuis le navigateur. Le profil reste masqué de l'annuaire tant que
 * `onboarding_completed` vaut false (filtre dans formations/page.tsx).
 *
 * Corps attendu (JSON) : { acceptTerms: true }
 * Réponses :
 *   200 { ok: true, role: 'coach', alreadyCoach, termsRecorded }
 *   400 JSON invalide, acceptTerms non booléen ou conditions non acceptées · 401 non connecté
 *   403 compte non élève (admin) · 409 profil modifié entre-temps · 413 corps trop volumineux
 *   415 Content-Type autre que JSON · 429 trop de tentatives · 500 écriture impossible
 *
 * Profil absent (upsert client échoué après signUp, compte social sans passage
 * par /auth/callback…) : créé ici en élève puis promu, jamais de 404 qui
 * laisserait un compte orphelin.
 *
 * Tolérance à l'ordre de déploiement : si la colonne `coach_terms_accepted_at`
 * n'existe pas encore (sql/coach-terms.sql non lancé), PostgREST refuse la
 * mise à jour (PGRST204 « column not found in schema cache », ou 42703 côté
 * Postgres). On refait alors la mise à jour sans l'horodatage et on
 * journalise un avertissement avec l'id et l'heure d'acceptation.
 */

const TERMS_COLUMN = 'coach_terms_accepted_at'
const MISSING_COLUMN_CODES = new Set(['PGRST204', '42703'])
const UNIQUE_VIOLATION = '23505'
const APPLY_RATE_LIMIT = 5          // tentatives…
const APPLY_RATE_WINDOW_MS = 60_000 // …par minute et par utilisateur
const USERNAME_MAX_LENGTH = 24
const USERNAME_RETRIES = 3

// Q11 : acceptTerms facultatif ici (un coach déjà promu reçoit 200 sans l'envoyer), booléen strict sinon.
const ApplyBody = object({ acceptTerms: optional(boolean()) })

type ProfileRow = { id: string; role: string | null }
type UserMeta = { username?: string; full_name?: string; name?: string; avatar_url?: string }

function isMissingTermsColumn(error: PostgrestError): boolean {
  return MISSING_COLUMN_CODES.has(error.code) && error.message.includes(TERMS_COLUMN)
}

/* Profil élève minimal : même logique et mêmes champs que
   app/auth/callback/route.ts (pseudo tiré des métadonnées ou de l'email,
   suffixe aléatoire en cas de collision sur profiles.username). */
async function createStudentProfile(admin: SupabaseClient, user: User): Promise<ProfileRow | null> {
  const meta = (user.user_metadata ?? {}) as UserMeta
  const base = (meta.username || meta.full_name || meta.name || user.email?.split('@')[0] || 'joueur')
    .trim().replace(/\s+/g, '_').slice(0, USERNAME_MAX_LENGTH)
  let username = base
  for (let i = 0; i < USERNAME_RETRIES; i++) {
    const { error } = await admin.from('profiles').insert({
      id: user.id, email: user.email, username, role: 'student', xp: 0,
      avatar_url: meta.avatar_url ?? null,
    })
    if (!error) return { id: user.id, role: 'student' }
    if (error.code === UNIQUE_VIOLATION && error.message.includes('username')) {
      username = `${base}_${Math.floor(Math.random() * 9000 + 1000)}`
      continue
    }
    if (error.code === UNIQUE_VIOLATION) {
      // Créé entre-temps (upsert client concurrent) : on le relit
      const { data } = await admin.from('profiles').select('id, role').eq('id', user.id).maybeSingle()
      return (data as ProfileRow | null) ?? null
    }
    console.error('[coach/apply] création du profil élève impossible:', error.code, error.message)
    return null
  }
  console.error(`[coach/apply] création du profil élève impossible : pseudo indisponible après ${USERNAME_RETRIES} essais`)
  return null
}

/* Passage élève → coach, conditionné à role = 'student' dans l'UPDATE lui-même
   (pas de fenêtre entre lecture et écriture) ; `updated` = une ligne a changé. */
async function promoteToCoach(admin: SupabaseClient, userId: string, payload: Record<string, unknown>) {
  const { data, error } = await admin
    .from('profiles')
    .update(payload)
    .eq('id', userId)
    .eq('role', 'student')
    .select('id')
  return { error, updated: (data?.length ?? 0) > 0 }
}

export async function POST(req: NextRequest) {
  const userClient = await createServerSupabaseClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Connecte-toi pour continuer' }, { status: 401 })

  const limit = rateLimit(`coach-apply:${user.id}`, APPLY_RATE_LIMIT, APPLY_RATE_WINDOW_MS)
  if (!limit.ok) return tooManyRequests(limit.retryAfter)

  // Content-Type (415), taille (413), JSON et schéma (400) : lib/validate.ts
  const body = await readJsonBody(req, ApplyBody, { tag: 'coach/apply' })
  if (!body.ok) return body.response

  const admin = createAdminSupabaseClient()
  const { data: existing, error: readError } = await admin
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .maybeSingle()

  if (readError) {
    console.error('[coach/apply] lecture du profil impossible:', readError.message)
    return NextResponse.json({ error: 'Lecture du profil impossible, réessaie' }, { status: 500 })
  }

  const profile = (existing as ProfileRow | null) ?? await createStudentProfile(admin, user)
  if (!profile) {
    return NextResponse.json({ error: 'Profil introuvable et impossible à créer, contacte le support' }, { status: 500 })
  }

  // Idempotent : déjà coach, rien à faire
  if (profile.role === 'coach') {
    return NextResponse.json({ ok: true, role: 'coach', alreadyCoach: true, termsRecorded: false })
  }
  if (profile.role !== 'student') {
    return NextResponse.json({ error: 'Réservé aux comptes élève' }, { status: 403 })
  }
  if (body.data.acceptTerms !== true) {
    return NextResponse.json({ error: 'Tu dois accepter les conditions coach' }, { status: 400 })
  }

  const acceptedAt = new Date().toISOString()
  const baseUpdate = { role: 'coach', onboarding_completed: false }

  let termsRecorded = true
  let result = await promoteToCoach(admin, user.id, { ...baseUpdate, [TERMS_COLUMN]: acceptedAt })

  if (result.error && isMissingTermsColumn(result.error)) {
    console.warn(
      `[coach/apply] colonne ${TERMS_COLUMN} absente (lance sql/coach-terms.sql) : ` +
      `acceptation NON horodatée en base pour ${user.id} à ${acceptedAt}`,
    )
    termsRecorded = false
    result = await promoteToCoach(admin, user.id, baseUpdate)
  }

  if (result.error) {
    console.error('[coach/apply] passage en coach impossible:', result.error.code, result.error.message)
    return NextResponse.json({ error: 'Passage en coach impossible, réessaie dans un instant' }, { status: 500 })
  }
  if (!result.updated) {
    return NextResponse.json({ error: 'Ton profil a changé entre-temps, recharge la page' }, { status: 409 })
  }

  return NextResponse.json({ ok: true, role: 'coach', alreadyCoach: false, termsRecorded })
}
