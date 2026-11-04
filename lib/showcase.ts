/* Vitrine conditionnelle de la landing (D2 §2.6) et, plus tard, états vides de la marketplace (D12) :
   une seule règle de seuil, une seule fonction getShowcase(). Lecture anonyme (client sans cookie), aucune
   donnée protégée : ce qui est lu ici est exactement ce que l'annuaire public affiche déjà. */
import { verifiedCoachIds } from '@/lib/coaches'
import { createAnonSupabaseClient } from '@/lib/supabase/server'

function thresholdFromEnv(name: string, fallback: number): number {
  const value = Number.parseInt(process.env[name] ?? '', 10)
  return Number.isInteger(value) && value >= 0 ? value : fallback
}

/** Seuils d'affichage (surchargeables par variable d'environnement serveur, sans redéploiement de structure). */
export const SHOWCASE_MIN_COACHES = thresholdFromEnv('SHOWCASE_MIN_COACHES', 4)
export const SHOWCASE_MIN_CONTENTS = thresholdFromEnv('SHOWCASE_MIN_CONTENTS', 6)
/** Nombre de lignes montrées : 4 coachs, 6 contenus. */
export const SHOWCASE_COACHES_LIMIT = 4
export const SHOWCASE_CONTENTS_LIMIT = 6
/** Badge « Nouveau » sur le contenu le plus récent, s'il est publié depuis moins de 14 jours (un par liste). */
export const SHOWCASE_NEW_DAYS = 14

export type ShowcaseContentType = 'formation' | 'video'

export interface ShowcaseCoach {
  id: string
  username: string | null
  avatarUrl: string | null
  variants: string[]
  hourlyRate: number | null
  yearsExperience: number | null
  formationCount: number
  verified: boolean
}

export interface ShowcaseContent {
  id: string
  title: string
  price: number
  level: string | null
  variant: string | null
  contentType: ShowcaseContentType
  modulesCount: number
  thumbnailUrl: string | null
  coachUsername: string | null
  isNew: boolean
}

export interface Showcase {
  coachCount: number
  contentCount: number
  coaches: ShowcaseCoach[]
  contents: ShowcaseContent[]
}

export const EMPTY_SHOWCASE: Showcase = { coachCount: 0, contentCount: 0, coaches: [], contents: [] }

export type CoachesRowState = 'hidden' | 'compact' | 'full'
export type ContentsRowState = 'hidden' | 'full'

/** Les deux rangées sont indépendantes (tableau de D2 §2.6) : 0 coach → masquée ; 1 à 3 → liste compacte ; 4 et plus → complète. */
export function showcaseState(showcase: Showcase): { coaches: CoachesRowState; contents: ContentsRowState } {
  const coaches: CoachesRowState = showcase.coaches.length === 0 || showcase.coachCount === 0
    ? 'hidden'
    : showcase.coachCount < SHOWCASE_MIN_COACHES ? 'compact' : 'full'
  const contents: ContentsRowState = showcase.contents.length === 0 || showcase.contentCount < SHOWCASE_MIN_CONTENTS
    ? 'hidden'
    : 'full'
  return { coaches, contents }
}

interface CoachRow {
  id: string
  username: string | null
  avatar_url: string | null
  variants: string[] | null
  hourly_rate: number | null
  years_experience: number | null
  formations: { count: number }[] | null
}

interface ContentRow {
  id: string
  title: string | null
  price: number | null
  level: string | null
  variant: string | null
  content_type: string | null
  thumbnail_url: string | null
  modules_count: number | null
  created_at: string | null
  profiles: { username: string | null } | { username: string | null }[] | null
}

const CONTENT_TYPES: readonly ShowcaseContentType[] = ['formation', 'video']

function coachUsername(row: ContentRow): string | null {
  const coach = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
  return coach?.username ?? null
}

function isRecent(createdAt: string | null, now: number): boolean {
  if (!createdAt) return false
  const age = now - new Date(createdAt).getTime()
  return Number.isFinite(age) && age >= 0 && age < SHOWCASE_NEW_DAYS * 86_400_000
}

/** Compteurs et listes de la vitrine. En cas d'erreur : vitrine vide (masquée) et erreur journalisée côté serveur, jamais une section cassée. */
export async function getShowcase(now: Date = new Date()): Promise<Showcase> {
  try {
    const supabase = createAnonSupabaseClient()
    const [coachCountRes, coachesRes, contentCountRes, contentsRes, verified] = await Promise.all([
      supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'coach')
        .eq('onboarding_completed', true),
      supabase
        .from('profiles')
        .select('id, username, avatar_url, variants, hourly_rate, years_experience, formations(count)')
        .eq('role', 'coach')
        .eq('onboarding_completed', true)
        .order('created_at', { ascending: true })
        .limit(SHOWCASE_COACHES_LIMIT),
      supabase
        .from('formations')
        .select('id, profiles!inner(onboarding_completed)', { count: 'exact', head: true })
        .eq('published', true)
        .in('content_type', [...CONTENT_TYPES])
        .eq('profiles.onboarding_completed', true),
      supabase
        .from('formations')
        .select('id, title, price, level, variant, content_type, thumbnail_url, modules_count, created_at, profiles!inner(username, onboarding_completed)')
        .eq('published', true)
        .in('content_type', [...CONTENT_TYPES])
        .eq('profiles.onboarding_completed', true)
        .order('created_at', { ascending: false })
        .limit(SHOWCASE_CONTENTS_LIMIT),
      verifiedCoachIds(supabase),
    ])
    const failed = [coachCountRes, coachesRes, contentCountRes, contentsRes].find((res) => res.error)
    if (failed?.error) throw new Error(failed.error.message)

    const coaches: ShowcaseCoach[] = ((coachesRes.data ?? []) as CoachRow[]).map((row) => ({
      id: row.id,
      username: row.username,
      avatarUrl: row.avatar_url,
      variants: (row.variants ?? []).filter((v): v is string => typeof v === 'string' && v.length > 0),
      hourlyRate: row.hourly_rate,
      yearsExperience: row.years_experience,
      formationCount: row.formations?.[0]?.count ?? 0,
      verified: verified.has(row.id),
    }))
    const nowMs = now.getTime()
    const contents: ShowcaseContent[] = ((contentsRes.data ?? []) as ContentRow[]).map((row, index) => ({
      id: row.id,
      title: row.title ?? 'Sans titre',
      price: row.price ?? 0,
      level: row.level,
      variant: row.variant,
      contentType: row.content_type === 'video' ? 'video' : 'formation',
      modulesCount: row.modules_count ?? 0,
      thumbnailUrl: row.thumbnail_url,
      coachUsername: coachUsername(row),
      // Le plus récent seulement (la liste est triée par date décroissante) : un badge par liste
      isNew: index === 0 && isRecent(row.created_at, nowMs),
    }))
    return { coachCount: coachCountRes.count ?? 0, contentCount: contentCountRes.count ?? 0, coaches, contents }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[showcase] vitrine masquée, requête en échec :', message)
    return EMPTY_SHOWCASE
  }
}
