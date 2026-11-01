/* ── Colonnes vidéo (sql/video-hosting.sql, V1) ────────────────────────────────
   Une vidéo est soit un LIEN (YouTube, Vimeo), soit un MP4 TÉLÉVERSÉ chez
   l'hébergeur retenu en X7. Les mêmes colonnes existent sur formation_lessons
   (une par leçon) et sur formation_videos (une ligne par formation de type
   « video », table protégée par RLS : future source de vérité de V2).

   Ici, le mode lien seulement : video_provider et video_asset_id viennent du
   parsing V3 (lib/video-url.ts). video_type (ancien champ, encore lu par les
   pages élève) reste écrit avec la règle historique « vimeo sinon youtube ».

   Transition : tant que le SQL n'est pas passé, PostgREST répond PGRST204
   (colonne inconnue) ou PGRST205 (table inconnue) ; on réécrit alors sans les
   nouvelles colonnes, comme lib/purchases.ts (R10) et /api/coach/apply (N3). */
import type { SupabaseClient } from '@supabase/supabase-js'
import { parseVideoUrl } from '@/lib/video-url'

/** Valeurs admises par les CHECK de formation_lessons et formation_videos. */
export type VideoProviderColumn = 'youtube' | 'vimeo' | 'upload'
export type VideoStatusColumn = 'ready' | 'processing' | 'failed'
export type LegacyVideoType = 'youtube' | 'vimeo'

export interface VideoLinkColumns {
  /** NULL : pas de lien, fichier direct ou URL non reconnue. */
  video_provider: Exclude<VideoProviderColumn, 'upload'> | null
  /** ID YouTube (11 car.) ou ID numérique Vimeo. */
  video_asset_id: string | null
  /** Ancien champ, conservé le temps que les pages élève lisent video_provider. */
  video_type: LegacyVideoType
}

type WriteError = { code?: string; message?: string } | null
type WriteResult = { error: WriteError }
type Row = Record<string, unknown>

/* Colonnes absentes d'une base où sql/video-hosting.sql n'a pas encore tourné. */
const TRANSITION_COLUMNS: ReadonlyArray<string> = ['video_provider', 'video_asset_id']

/** Colonnes à écrire pour le lien saisi par le coach. */
export function videoLinkColumns(url: string | null | undefined): VideoLinkColumns {
  const parsed = parseVideoUrl(url)
  if (parsed?.provider === 'youtube' || parsed?.provider === 'vimeo') {
    return { video_provider: parsed.provider, video_asset_id: parsed.id, video_type: parsed.provider }
  }
  return { video_provider: null, video_asset_id: null, video_type: 'youtube' }
}

/** Message court affiché quand un contenu payant reçoit autre chose qu'un lien YouTube ou Vimeo. */
export const VIDEO_LINK_REQUIRED = 'Lien YouTube ou Vimeo attendu'

/** Contenu PAYANT : seul un lien YouTube ou Vimeo est accepté. Un fichier direct
    (.mp4 externe) ou un lien non reconnu (video_provider NULL) n'est toléré que
    pour une leçon gratuite ou une formation gratuite. L'existant en base n'est
    pas modifié (listé « à reprendre » par la vérification du SQL). */
export function isVideoLinkRefused(url: string | null | undefined, isPaid: boolean): boolean {
  const link = url?.trim() ?? ''
  return isPaid && link !== '' && videoLinkColumns(link).video_provider === null
}

/* PGRST204 : colonne inconnue du cache de schéma PostgREST (écriture) ;
   42703 : colonne inconnue côté Postgres. */
export function isMissingColumnError(err: WriteError | undefined): boolean {
  return err?.code === 'PGRST204' || err?.code === '42703'
}

/* PGRST205 : table inconnue du cache de schéma PostgREST ; 42P01 côté Postgres. */
export function isMissingTableError(err: WriteError | undefined): boolean {
  return err?.code === 'PGRST205' || err?.code === '42P01'
}

/** Écrit une leçon avec ses colonnes vidéo ; si la base ne les connaît pas
    encore, réécrit la même ligne sans elles. Renvoie la réponse Supabase du
    dernier essai (R : le builder renvoyé par `run`, résolu par Awaited). */
export async function writeLessonVideo<R extends PromiseLike<WriteResult>>(
  row: Row,
  run: (row: Row) => R,
): Promise<Awaited<R>> {
  const first = await run(row)
  const { error } = first as WriteResult
  if (!error || !isMissingColumnError(error)) return first
  console.warn('[video-columns] video_provider/video_asset_id inconnues de la base (sql/video-hosting.sql non exécuté) : leçon écrite sans elles')
  const legacy = Object.fromEntries(Object.entries(row).filter(([key]) => !TRANSITION_COLUMNS.includes(key)))
  return await run(legacy)
}

/** Miroir protégé de formations.video_url : une ligne par formation « video »,
    supprimée quand le lien est retiré. Non bloquant tant que V2 n'a pas basculé
    les lectures élève sur formation_videos. */
export async function syncFormationVideo(
  supabase: SupabaseClient,
  formationId: string,
  url: string | null | undefined,
): Promise<void> {
  const link = url?.trim() ?? ''
  const { video_provider, video_asset_id } = videoLinkColumns(link)
  const { error } = link
    ? await supabase
        .from('formation_videos')
        .upsert(
          /* Colonnes d'upload remises explicitement à leur valeur « lien » : repasser
             d'un upload (V4) à un lien ne doit laisser ni statut ni hébergeur
             incohérents (CHECK video_link_ready / video_upload_storage). */
          { formation_id: formationId, video_url: link, video_provider, video_asset_id, video_storage: null, video_status: 'ready', video_duration_seconds: null, video_meta: {} },
          { onConflict: 'formation_id' },
        )
    : await supabase.from('formation_videos').delete().eq('formation_id', formationId)
  if (!error) return
  if (isMissingTableError(error)) {
    console.warn('[video-columns] table formation_videos absente (sql/video-hosting.sql non exécuté) : miroir ignoré')
    return
  }
  console.warn(`[video-columns] formation_videos (${formationId}) : ${error.message}`)
}
