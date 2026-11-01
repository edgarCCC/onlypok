-- =====================================================================
-- OnlyPok — V1 « Modèle de données vidéo : lien ou upload » (2026-11-01)
-- À exécuter par Edgar dans Supabase > SQL Editor > Run, UNE FOIS, APRÈS le
-- déploiement du code (voir ORDRE DE DÉPLOIEMENT). Idempotent, tout-ou-rien
-- (transaction), verrous brefs (lock_timeout 5 s).
--
-- POURQUOI
--   Une vidéo est soit un LIEN (YouTube ou Vimeo, privé si payant), soit un
--   MP4 TÉLÉVERSÉ chez un hébergeur pas encore choisi (décision X7, aucun
--   frais engagé). Jusqu'ici le seul champ était formation_lessons.video_type
--   ('youtube' | 'vimeo', déduit de l'URL) et rien pour une formation de type
--   « video » (formations.video_url seulement, lisible par tous : fuite V2).
--
-- CE QUE ÇA FAIT
--   0. Deux fonctions pures public.video_asset_id_from_url(text) et
--      public.video_provider_from_url(text) : mêmes hôtes et même exigence
--      d'un ID valide que lib/video-url.ts (V3). Elles servent à la reprise
--      et aux compteurs de vérification (lançables seuls, à tout moment).
--      Sans accès aux tables ; exécution réservée à service_role.
--   1. formation_lessons : 6 colonnes explicites, indépendantes de l'hébergeur.
--        video_provider          'youtube' | 'vimeo' | 'upload'
--                                (NULL = pas de vidéo, ou lien non reconnu)
--        video_asset_id          identifiant chez l'hébergeur : ID YouTube
--                                (11 car.), ID numérique Vimeo, asset id de
--                                l'upload (NULL tant qu'il n'est pas connu)
--        video_storage           nom de l'hébergeur d'un upload ('mux',
--                                'bunny', 'cloudflare-stream', 'supabase'…),
--                                NULL pour un lien — obligatoire si 'upload'
--        video_status            'ready' | 'processing' | 'failed'
--                                (un lien est toujours 'ready')
--        video_duration_seconds  durée exacte renvoyée par l'hébergeur
--                                (NULL si inconnue ; `duration` en minutes
--                                reste la durée affichée / saisie)
--        video_meta              jsonb : identifiants secondaires propres à
--                                l'hébergeur (playback id, library id…),
--                                forme figée en V4 une fois X7 tranchée.
--                                JAMAIS DE SECRET (clé d'API, jeton, URL
--                                signée) : la colonne est lisible par tous sur
--                                une leçon gratuite ou la vidéo d'une
--                                formation gratuite. Identifiants publics
--                                seulement ; les signatures se font en V5,
--                                côté serveur.
--      L'ancien video_type est CONSERVÉ : les pages élève le lisent encore.
--      Le code coach l'écrit toujours (règle historique « vimeo sinon
--      youtube »), à retirer quand les pages élève liront video_provider.
--   2. formation_videos : NOUVELLE table, une ligne par formation de type
--      « video » (clé = formation_id), mêmes colonnes + video_url.
--      C'est la maison PROTÉGÉE de la vidéo d'une formation : RLS calquée sur
--      lessons_select (gratuit OU acheté OU coach propriétaire OU admin),
--      aucune écriture anonyme. formations.video_url reste en place et
--      alimenté (double écriture côté coach) jusqu'à V2, qui bascule les
--      lectures élève sur cette table puis vide / supprime l'ancienne colonne.
--   3. Reprise des données existantes (idempotente) :
--        - video_provider dérivé de l'URL : YouTube → 'youtube', Vimeo →
--          'vimeo' (mêmes hôtes et même exigence d'un ID valide que
--          lib/video-url.ts, V3) ; sinon NULL (fichier direct ou lien non
--          reconnu — le code écrivait 'youtube' par défaut dans video_type,
--          on ne reporte pas cette approximation dans la nouvelle colonne ;
--          ces lignes sortent dans la vérification, bloc 4) ;
--        - video_asset_id extrait de l'URL quand c'est possible ;
--        - formation_videos remplie depuis formations.video_url
--          (content_type = 'video', lien non vide) ; une ligne déjà présente
--          n'est JAMAIS modifiée (DO NOTHING : après V2 la table est la seule
--          source de vérité, une relance ne doit pas remettre un ancien lien) ;
--        - le reste inchangé.
--   Règle de saisie côté coach (code V1) : pour un contenu PAYANT, seul un
--   lien YouTube ou Vimeo est accepté ; un fichier direct (.mp4 externe) ou un
--   lien non reconnu (video_provider NULL) n'est toléré que pour une leçon
--   gratuite ou une formation gratuite. L'existant n'est pas modifié.
--
-- ORDRE DE DÉPLOIEMENT : LE CODE D'ABORD, puis ce SQL, une seule fois.
--   1. Déployer le code (commit V1). Tant que le SQL n'est pas passé, les
--      pages coach reçoivent PGRST204 (colonne inconnue) / PGRST205 (table
--      inconnue), réécrivent sans les nouvelles colonnes et le signalent en
--      console navigateur (« [video-columns] … ») : rien n'est perdu.
--   2. Recharger les onglets coach restés ouverts (un ancien bundle écrit
--      video_url sans fournisseur) et NE MODIFIER AUCUN LIEN VIDÉO entre les
--      deux étapes.
--   3. Lancer ce fichier une fois, à un moment calme (relancer tel quel si
--      « canceling statement due to lock timeout »).
--   Pourquoi cet ordre : la reprise ne vise que les lignes SANS fournisseur.
--   Une leçon dont l'ancien code a changé le lien après une première
--   exécution garderait le fournisseur et l'identifiant de l'ANCIENNE vidéo.
--   Les compteurs *_desynchronisees du bloc 2 de la vérification (attendus
--   à 0 avant V2) détectent ce cas : rouvrir et enregistrer la leçon dans
--   l'espace coach (qui réécrit les trois colonnes), ou corriger à la main.
--
-- RETOUR ARRIÈRE : bloc commenté en fin de fichier. formations.video_url
-- n'est pas modifié et le code tolère l'absence des colonnes et de la table :
-- aucun redéploiement nécessaire. ATTENTION dès V4 : le retour arrière
-- DÉTRUIT les métadonnées d'upload (asset id, hébergeur, statut, durée,
-- video_meta) des leçons et des formations ; les fichiers chez l'hébergeur
-- deviennent orphelins. Ne plus l'utiliser une fois l'upload en service.
--
-- COÛT : ADD COLUMN nullable ou avec DEFAULT constant = métadonnées
-- seulement (Postgres 11+), pas de réécriture ; UPDATE de reprise sur
-- quelques dizaines de lignes ; CHECK ajoutés après la reprise (un scan).
-- Verrous ACCESS EXCLUSIVE brefs, bornés par lock_timeout.
-- =====================================================================

BEGIN;
SET LOCAL lock_timeout = '5s';

-- ---------------------------------------------------------------------
-- 0. Fonctions pures d'analyse d'URL (aucun accès aux tables).
--    Identifiant chez l'hébergeur : ID YouTube (11 car.) ou ID numérique
--    Vimeo ; NULL si l'hôte n'est pas reconnu ou si aucun ID valide n'est
--    trouvé (même exigence que lib/video-url.ts : pas d'ID, pas de vidéo).
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.video_asset_id_from_url(raw text)
RETURNS text
LANGUAGE sql IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN btrim(raw) ~* '^(https?://)?([a-z0-9-]+\.)*(youtube\.com|youtube-nocookie\.com|youtu\.be)([/?#]|$)' THEN COALESCE(
      substring(btrim(raw) from '[?&]v=([A-Za-z0-9_-]{11})(?:[&#]|$)'),
      substring(btrim(raw) from '(?i)youtu\.be/([A-Za-z0-9_-]{11})(?:[/?#]|$)'),
      substring(btrim(raw) from '/(?:embed|shorts|live|v)/([A-Za-z0-9_-]{11})(?:[/?#]|$)'))
    WHEN btrim(raw) ~* '^(https?://)?([a-z0-9-]+\.)*vimeo\.com([/?#]|$)' THEN COALESCE(
      substring(btrim(raw) from '/videos?/(\d+)(?:[/?#]|$)'),
      substring(btrim(raw) from '(?i)vimeo\.com/(?:(?:channels|groups|showcase)/[^/?#]+/)?(\d+)(?:[/?#]|$)'))
  END
$$;

-- Fournisseur : 'youtube' ou 'vimeo' seulement si un ID a été trouvé, sinon NULL.
CREATE OR REPLACE FUNCTION public.video_provider_from_url(raw text)
RETURNS text
LANGUAGE sql IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN public.video_asset_id_from_url(raw) IS NULL THEN NULL
    WHEN btrim(raw) ~* '^(https?://)?([a-z0-9-]+\.)*(youtube\.com|youtube-nocookie\.com|youtu\.be)([/?#]|$)' THEN 'youtube'
    ELSE 'vimeo'
  END
$$;

COMMENT ON FUNCTION public.video_asset_id_from_url(text) IS
  'ID YouTube (11 car.) ou ID numérique Vimeo extrait d''une URL ; NULL sinon. Même règle que lib/video-url.ts. Reprise et vérification de sql/video-hosting.sql.';
COMMENT ON FUNCTION public.video_provider_from_url(text) IS
  'youtube | vimeo d''après l''URL, seulement si un ID valide est trouvé ; NULL sinon. Même règle que lib/video-url.ts.';

REVOKE ALL ON FUNCTION public.video_asset_id_from_url(text), public.video_provider_from_url(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.video_asset_id_from_url(text), public.video_provider_from_url(text) TO service_role;

-- ---------------------------------------------------------------------
-- 1. formation_lessons : colonnes explicites
-- ---------------------------------------------------------------------
ALTER TABLE public.formation_lessons
  ADD COLUMN IF NOT EXISTS video_provider         text,
  ADD COLUMN IF NOT EXISTS video_asset_id         text,
  ADD COLUMN IF NOT EXISTS video_storage          text,
  ADD COLUMN IF NOT EXISTS video_status           text    NOT NULL DEFAULT 'ready',
  ADD COLUMN IF NOT EXISTS video_duration_seconds integer,
  ADD COLUMN IF NOT EXISTS video_meta             jsonb   NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.formation_lessons.video_provider IS
  'youtube | vimeo | upload. NULL = pas de vidéo ou lien non reconnu. Source : parsing lib/video-url.ts (coach) ou reprise sql/video-hosting.sql.';
COMMENT ON COLUMN public.formation_lessons.video_asset_id IS
  'Identifiant chez l''hébergeur : ID YouTube (11 car.), ID numérique Vimeo, asset id de l''upload (NULL tant qu''inconnu).';
COMMENT ON COLUMN public.formation_lessons.video_storage IS
  'Hébergeur d''un upload (mux, bunny, cloudflare-stream, supabase…). NULL pour un lien. Obligatoire si video_provider = upload.';
COMMENT ON COLUMN public.formation_lessons.video_status IS
  'ready | processing | failed. Un lien est toujours ready ; seul un upload peut être processing ou failed.';
COMMENT ON COLUMN public.formation_lessons.video_duration_seconds IS
  'Durée exacte renvoyée par l''hébergeur, en secondes. NULL si inconnue. La colonne duration (minutes) reste la durée affichée.';
COMMENT ON COLUMN public.formation_lessons.video_meta IS
  'Identifiants secondaires PUBLICS propres à l''hébergeur (playback id, library id…), jamais de secret : lisible par tous sur une leçon gratuite. Forme figée en V4.';
COMMENT ON COLUMN public.formation_lessons.video_type IS
  'ANCIEN champ (youtube | vimeo), encore lu par les pages élève. Remplacé par video_provider ; à retirer quand plus aucune lecture ne l''utilise.';

-- Reprise : uniquement les lignes qui ont un lien et pas encore de fournisseur.
UPDATE public.formation_lessons
SET video_provider = public.video_provider_from_url(video_url),
    video_asset_id = COALESCE(video_asset_id, public.video_asset_id_from_url(video_url))
WHERE video_provider IS NULL
  AND NULLIF(btrim(video_url), '') IS NOT NULL
  AND public.video_provider_from_url(video_url) IS NOT NULL;

-- Contraintes (après la reprise ; ADD CONSTRAINT n'a pas de IF NOT EXISTS).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.formation_lessons'::regclass AND conname = 'formation_lessons_video_provider_check') THEN
    ALTER TABLE public.formation_lessons ADD CONSTRAINT formation_lessons_video_provider_check
      CHECK (video_provider IN ('youtube', 'vimeo', 'upload'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.formation_lessons'::regclass AND conname = 'formation_lessons_video_status_check') THEN
    ALTER TABLE public.formation_lessons ADD CONSTRAINT formation_lessons_video_status_check
      CHECK (video_status IN ('ready', 'processing', 'failed'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.formation_lessons'::regclass AND conname = 'formation_lessons_video_duration_check') THEN
    ALTER TABLE public.formation_lessons ADD CONSTRAINT formation_lessons_video_duration_check
      CHECK (video_duration_seconds IS NULL OR video_duration_seconds >= 0);
  END IF;
  -- Un upload dit toujours où il est stocké.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.formation_lessons'::regclass AND conname = 'formation_lessons_video_upload_storage_check') THEN
    ALTER TABLE public.formation_lessons ADD CONSTRAINT formation_lessons_video_upload_storage_check
      CHECK (video_provider IS DISTINCT FROM 'upload' OR video_storage IS NOT NULL);
  END IF;
END $$;

-- Seul un upload peut être en traitement ou en échec. Écrit sous la forme
-- « ready OU upload » (IS NOT DISTINCT FROM) pour qu'un fournisseur NULL ne
-- rende pas la contrainte indéterminée (NULL OR FALSE = NULL = accepté).
-- DROP + ADD : une relance remplace une version antérieure de la contrainte.
ALTER TABLE public.formation_lessons DROP CONSTRAINT IF EXISTS formation_lessons_video_link_ready_check;
ALTER TABLE public.formation_lessons ADD CONSTRAINT formation_lessons_video_link_ready_check
  CHECK (video_status = 'ready' OR video_provider IS NOT DISTINCT FROM 'upload');

-- ---------------------------------------------------------------------
-- 2. formation_videos : la vidéo d'une formation de type « video »,
--    une ligne par formation, protégée par RLS (modèle des leçons).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.formation_videos (
  formation_id           uuid PRIMARY KEY REFERENCES public.formations(id) ON DELETE CASCADE,
  video_url              text,
  video_provider         text,
  video_asset_id         text,
  video_storage          text,
  video_status           text        NOT NULL DEFAULT 'ready',
  video_duration_seconds integer,
  video_meta             jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT formation_videos_video_provider_check       CHECK (video_provider IN ('youtube', 'vimeo', 'upload')),
  CONSTRAINT formation_videos_video_status_check         CHECK (video_status IN ('ready', 'processing', 'failed')),
  CONSTRAINT formation_videos_video_duration_check       CHECK (video_duration_seconds IS NULL OR video_duration_seconds >= 0),
  CONSTRAINT formation_videos_video_upload_storage_check CHECK (video_provider IS DISTINCT FROM 'upload' OR video_storage IS NOT NULL)
);

-- Même contrainte « ready OU upload » que sur les leçons, posée hors du CREATE
-- pour qu'une relance remplace une version antérieure.
ALTER TABLE public.formation_videos DROP CONSTRAINT IF EXISTS formation_videos_video_link_ready_check;
ALTER TABLE public.formation_videos ADD CONSTRAINT formation_videos_video_link_ready_check
  CHECK (video_status = 'ready' OR video_provider IS NOT DISTINCT FROM 'upload');

COMMENT ON TABLE public.formation_videos IS
  'Vidéo d''une formation de type « video » (une ligne par formation). Lien YouTube/Vimeo ou upload. Lecture : formation gratuite, acheteur, coach propriétaire, admin (fvideos_select). Remplace formations.video_url (V2).';
COMMENT ON COLUMN public.formation_videos.video_url IS
  'Lien YouTube/Vimeo tel que saisi (clé de partage Vimeo incluse). NULL pour un upload (lecture via video_asset_id + route serveur signée, V5).';
COMMENT ON COLUMN public.formation_videos.video_provider IS
  'youtube | vimeo | upload. NULL = lien non reconnu.';
COMMENT ON COLUMN public.formation_videos.video_asset_id IS
  'Identifiant chez l''hébergeur : ID YouTube, ID numérique Vimeo, asset id de l''upload.';
COMMENT ON COLUMN public.formation_videos.video_storage IS
  'Hébergeur d''un upload (mux, bunny, cloudflare-stream, supabase…). NULL pour un lien.';
COMMENT ON COLUMN public.formation_videos.video_status IS
  'ready | processing | failed. Un lien est toujours ready.';
COMMENT ON COLUMN public.formation_videos.video_duration_seconds IS
  'Durée exacte renvoyée par l''hébergeur, en secondes. NULL si inconnue.';
COMMENT ON COLUMN public.formation_videos.video_meta IS
  'Identifiants secondaires PUBLICS propres à l''hébergeur, jamais de secret : lisible par tous sur la vidéo d''une formation gratuite. Forme figée en V4.';
COMMENT ON COLUMN public.formations.video_url IS
  'ANCIEN emplacement, lisible par tous (fuite V2). Miroir : public.formation_videos (protégée). À vider puis supprimer quand les lectures élève auront basculé (V2).';

-- updated_at tenu à jour quelle que soit l'origine de l'écriture (coach,
-- route serveur, webhook de l'hébergeur en V4).
CREATE OR REPLACE FUNCTION public.formation_videos_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_formation_videos_updated_at ON public.formation_videos;
CREATE TRIGGER trg_formation_videos_updated_at
  BEFORE UPDATE ON public.formation_videos
  FOR EACH ROW EXECUTE FUNCTION public.formation_videos_touch_updated_at();

-- Droits : on repart de zéro (les droits par défaut de Supabase donneraient
-- ALL à anon et authenticated, TRUNCATE compris, qui ignore la RLS), puis le
-- strict nécessaire : lecture anon/authenticated filtrée par RLS, écriture
-- authentifiée seulement (le coach propriétaire via la policy).
REVOKE ALL ON public.formation_videos FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.formation_videos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.formation_videos TO authenticated;
GRANT ALL ON public.formation_videos TO service_role;

ALTER TABLE public.formation_videos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "fvideos_select"      ON public.formation_videos;
DROP POLICY IF EXISTS "fvideos_write_owner" ON public.formation_videos;

-- Même règle que lessons_select : formation gratuite, OU achat, OU coach
-- propriétaire, OU admin. La sous-requête sur formations passe par
-- formations_select (publiée, ou à soi) : la vidéo d'un brouillon gratuit
-- n'est donc pas visible d'un anonyme. (select auth.uid()) : évalué une fois.
CREATE POLICY "fvideos_select" ON public.formation_videos FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.formations f
      WHERE f.id = formation_videos.formation_id
        AND (f.coach_id = (select auth.uid()) OR COALESCE(f.price, 0) = 0)
    )
    OR EXISTS (
      SELECT 1 FROM public.formation_purchases fp
      WHERE fp.formation_id = formation_videos.formation_id
        AND fp.user_id = (select auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (select auth.uid()) AND p.role = 'admin'
    )
  );

CREATE POLICY "fvideos_write_owner" ON public.formation_videos FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.formations f
      WHERE f.id = formation_videos.formation_id AND f.coach_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.formations f
      WHERE f.id = formation_videos.formation_id AND f.coach_id = (select auth.uid())
    )
  );

-- Reprise depuis formations.video_url (formations « video » avec un lien).
-- Une ligne déjà présente n'est JAMAIS modifiée : après V2, formation_videos
-- est la seule source de vérité et une relance ne doit pas remettre un ancien
-- lien (vidéo payante) ni toucher une ligne d'upload. Les écarts éventuels
-- sortent dans la vérification (formations_video_desynchronisees).
INSERT INTO public.formation_videos (formation_id, video_url, video_provider, video_asset_id)
SELECT f.id,
       btrim(f.video_url),
       public.video_provider_from_url(f.video_url),
       public.video_asset_id_from_url(f.video_url)
FROM public.formations f
WHERE f.content_type = 'video'
  AND NULLIF(btrim(f.video_url), '') IS NOT NULL
ON CONFLICT (formation_id) DO NOTHING;

COMMIT;

-- Recharge le cache de schéma PostgREST sans attendre (sinon les pages coach
-- restent quelques secondes en mode dégradé PGRST204 / PGRST205).
NOTIFY pgrst, 'reload schema';


-- ---------------------------------------------------------------------
-- VÉRIFICATION — quatre blocs, chacun À LANCER SEUL (l'éditeur Supabase
-- n'affiche que le dernier résultat d'un script).
-- ---------------------------------------------------------------------
-- Bloc 1 (lancer seul) — structure et droits. Attendu : colonnes_lessons = 6,
-- table_presente = true, rls_active = true, policies = 2, fonctions = 2,
-- anon_ecrit = false, anon_tronque = false, authenticated_tronque = false.
SELECT
  (SELECT count(*) FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'formation_lessons'
      AND column_name IN ('video_provider', 'video_asset_id', 'video_storage',
                          'video_status', 'video_duration_seconds', 'video_meta')) AS colonnes_lessons,
  to_regclass('public.formation_videos') IS NOT NULL                              AS table_presente,
  (SELECT relrowsecurity FROM pg_class WHERE oid = to_regclass('public.formation_videos')) AS rls_active,
  (SELECT count(*) FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'formation_videos')               AS policies,
  (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('video_provider_from_url', 'video_asset_id_from_url'))    AS fonctions,
  has_table_privilege('anon', 'public.formation_videos', 'INSERT')              AS anon_ecrit,
  has_table_privilege('anon', 'public.formation_videos', 'TRUNCATE')            AS anon_tronque,
  has_table_privilege('authenticated', 'public.formation_videos', 'TRUNCATE')   AS authenticated_tronque;

-- Bloc 2 (lancer seul) — données. Attendu : lessons_lien_sans_fournisseur = 0
-- (sinon bloc 4), lessons_desynchronisees = 0 et
-- formations_video_desynchronisees = 0 (AVANT V2 ; un écart = lien modifié par
-- l'ancien code entre les deux étapes, ou URL limite : comparer à la main),
-- lignes_formation_videos = formations_video_avec_lien.
-- SELECT
--   (SELECT count(*) FROM public.formation_lessons
--     WHERE NULLIF(btrim(video_url), '') IS NOT NULL AND video_provider IS NULL)    AS lessons_lien_sans_fournisseur,
--   (SELECT count(*) FROM public.formation_lessons
--     WHERE video_provider IN ('youtube', 'vimeo')
--       AND (video_provider, video_asset_id) IS DISTINCT FROM
--           (public.video_provider_from_url(video_url), public.video_asset_id_from_url(video_url))) AS lessons_desynchronisees,
--   (SELECT count(*) FROM public.formations f
--     LEFT JOIN public.formation_videos fv ON fv.formation_id = f.id
--     WHERE f.content_type = 'video'
--       AND fv.video_url IS DISTINCT FROM NULLIF(btrim(f.video_url), ''))          AS formations_video_desynchronisees,
--   (SELECT count(*) FROM public.formations
--     WHERE content_type = 'video' AND NULLIF(btrim(video_url), '') IS NOT NULL)    AS formations_video_avec_lien,
--   (SELECT count(*) FROM public.formation_videos)                                  AS lignes_formation_videos;

-- Bloc 3 (lancer seul) — répartition par fournisseur (leçons puis formations).
-- SELECT 'lesson' AS source, video_provider, count(*)
-- FROM public.formation_lessons WHERE NULLIF(btrim(video_url), '') IS NOT NULL
-- GROUP BY video_provider
-- UNION ALL
-- SELECT 'formation', video_provider, count(*)
-- FROM public.formation_videos
-- GROUP BY video_provider
-- ORDER BY 1, 2;

-- Bloc 4 (lancer seul) — liens à reprendre à la main (fichier direct ou URL
-- non reconnue). Attendu : vide. L'existant n'est pas modifié par V1.
-- SELECT 'lesson' AS source, id::text AS id, video_url
-- FROM public.formation_lessons
-- WHERE NULLIF(btrim(video_url), '') IS NOT NULL AND video_provider IS NULL
-- UNION ALL
-- SELECT 'formation', formation_id::text, video_url
-- FROM public.formation_videos
-- WHERE video_provider IS NULL;


-- ---------------------------------------------------------------------
-- SONDES RLS (lecture seule, chacune à lancer seule, toujours terminées par
-- ROLLBACK). Attendu : un anonyme et un compte sans achat ne voient que les
-- vidéos des formations GRATUITES publiées ; un acheteur voit la sienne.
-- ---------------------------------------------------------------------
-- a) Anonyme — attendu : payantes_visibles = 0.
--   BEGIN;
--   SET LOCAL ROLE anon;
--   SELECT count(*)                                           AS visibles,
--          count(*) FILTER (WHERE COALESCE(f.price, 0) > 0)   AS payantes_visibles
--   FROM public.formation_videos fv
--   JOIN public.formations f ON f.id = fv.formation_id;
--   ROLLBACK;
--
-- b) Authentifié SANS achat (uuid d'un compte de test) — attendu : payantes_visibles = 0.
--   BEGIN;
--   SET LOCAL ROLE authenticated;
--   SELECT set_config('request.jwt.claims',
--     '{"sub":"<uuid du compte test sans achat>","role":"authenticated"}', true);
--   SELECT count(*)                                           AS visibles,
--          count(*) FILTER (WHERE COALESCE(f.price, 0) > 0)   AS payantes_visibles
--   FROM public.formation_videos fv
--   JOIN public.formations f ON f.id = fv.formation_id;
--   ROLLBACK;
--
-- c) Acheteur (uuid d'un élève ayant acheté une formation « video » payante)
--    — attendu : achetee_visible = 1.
--   BEGIN;
--   SET LOCAL ROLE authenticated;
--   SELECT set_config('request.jwt.claims',
--     '{"sub":"<uuid de l''acheteur>","role":"authenticated"}', true);
--   SELECT count(*) AS achetee_visible
--   FROM public.formation_videos
--   WHERE formation_id = '<id de la formation « video » payante achetée>';
--   ROLLBACK;


-- ---------------------------------------------------------------------
-- RETOUR ARRIÈRE (si besoin uniquement, et JAMAIS une fois l'upload V4 en
-- service : il détruit les métadonnées d'upload — asset id, hébergeur,
-- statut, durée, video_meta — des leçons et des formations, et rend les
-- fichiers chez l'hébergeur orphelins). formations.video_url n'ayant pas
-- été modifié, les élèves ne perdent aucun lien ; le code tolère l'absence
-- des colonnes et de la table.
-- ---------------------------------------------------------------------
--   BEGIN;
--   SET LOCAL lock_timeout = '5s';
--   DROP TABLE IF EXISTS public.formation_videos;
--   DROP FUNCTION IF EXISTS public.formation_videos_touch_updated_at();
--   DROP FUNCTION IF EXISTS public.video_provider_from_url(text);
--   DROP FUNCTION IF EXISTS public.video_asset_id_from_url(text);
--   ALTER TABLE public.formation_lessons
--     DROP COLUMN IF EXISTS video_provider,
--     DROP COLUMN IF EXISTS video_asset_id,
--     DROP COLUMN IF EXISTS video_storage,
--     DROP COLUMN IF EXISTS video_status,
--     DROP COLUMN IF EXISTS video_duration_seconds,
--     DROP COLUMN IF EXISTS video_meta;
--   COMMENT ON COLUMN public.formations.video_url IS NULL;
--   COMMENT ON COLUMN public.formation_lessons.video_type IS NULL;
--   COMMIT;
--   NOTIFY pgrst, 'reload schema';
