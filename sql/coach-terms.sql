-- =====================================================================
-- OnlyPok — N3 « Devenir coach » : horodatage de l'acceptation des
-- conditions coach (public.profiles.coach_terms_accepted_at) et garde
-- d'écriture (serveur uniquement).
-- À exécuter par Edgar dans Supabase > SQL Editor > Run. Idempotent.
--
-- QUAND : AVANT le déploiement du code N3 (recommandé), pour que chaque
-- acceptation soit horodatée en base dès la mise en ligne.
--   Si le code est déployé d'abord, POST /api/coach/apply tolère l'absence
--   de la colonne (PGRST204 ou 42703) : il refait la mise à jour sans
--   l'horodatage et journalise « [coach/apply] colonne coach_terms_accepted_at
--   absente … pour <user_id> à <heure> ». La preuve d'acceptation n'existe
--   alors que dans les logs Vercel, à reporter à la main : à éviter.
--
-- CE QUE ÇA FAIT :
--   1. Colonne coach_terms_accepted_at (timestamptz ; NULL = jamais
--      acceptées : coach créé avant N3 ou passé coach par un autre canal).
--   2. Trigger trg_protect_coach_terms : la preuve d'acceptation n'est
--      écrite que par le serveur (service role). Sans lui, son sujet
--      pourrait l'effacer (PATCH profiles?id=eq.<moi> avec
--      coach_terms_accepted_at: null passe par la policy profiles_update_own)
--      ou la poser lui-même à l'INSERT de son profil. Les autres colonnes
--      restent modifiables par le client, et renvoyer la valeur inchangée
--      ne gêne pas (IS DISTINCT FROM).
--
-- COLONNE PRIVÉE : volontairement absente du GRANT SELECT public de
-- profiles (sql/security-rls.sql). Son propriétaire la lit via
-- get_my_profile() (SELECT *) ; le serveur via le service role.
--
-- À VENIR avec L5 (texte juridique des conditions coach) : une colonne
-- coach_terms_version pour tracer la version acceptée. Pas nécessaire ici.
--
-- Coût : ADD COLUMN nullable sans défaut = métadonnées seulement, pas de
-- réécriture de table ; verrou ACCESS EXCLUSIVE très bref, borné par
-- lock_timeout (si « canceling statement due to lock timeout », relancer
-- à un moment plus calme).
--
-- Jamais les deux fichiers d'un coup : ce fichier d'abord (avant le
-- déploiement) ; sql/coach-role-guard.sql seul, après déploiement et test.
-- =====================================================================

BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS coach_terms_accepted_at timestamptz;

COMMENT ON COLUMN public.profiles.coach_terms_accepted_at IS
  'Acceptation des conditions coach via POST /api/coach/apply (UTC). NULL = jamais acceptées (coach créé avant N3 ou passé coach par un autre canal). Écriture serveur uniquement (trg_protect_coach_terms).';

-- Garde : écriture réservée aux rôles privilégiés (mêmes rôles que
-- protect_privileged_profile_columns). À l'INSERT la valeur doit rester
-- NULL ; à l'UPDATE elle doit rester égale à l'ancienne.
CREATE OR REPLACE FUNCTION public.protect_coach_terms()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF current_user NOT IN ('service_role', 'supabase_admin', 'postgres', 'supabase_auth_admin')
     AND NEW.coach_terms_accepted_at IS DISTINCT FROM (CASE WHEN TG_OP = 'UPDATE' THEN OLD.coach_terms_accepted_at END) THEN
    RAISE EXCEPTION 'coach_terms_accepted_at : écriture serveur uniquement'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_protect_coach_terms ON public.profiles;
CREATE TRIGGER trg_protect_coach_terms
  BEFORE INSERT OR UPDATE OF coach_terms_accepted_at ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_coach_terms();

COMMIT;

-- Recharge le cache de schéma PostgREST sans attendre (sinon /api/coach/apply
-- continue de tomber sur PGRST204 et sur son mode dégradé pendant quelques
-- secondes).
NOTIFY pgrst, 'reload schema';

-- Vérification — attendu : true, false, false, true.
-- anon_lit ou authenticated_lit à true = la colonne serait lisible par tous :
-- sql/security-rls.sql (REVOKE table + GRANT par colonne) n'est pas appliqué,
-- le relancer.
SELECT
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles'
      AND column_name = 'coach_terms_accepted_at'
  ) AS colonne_presente,
  has_column_privilege('anon', 'public.profiles', 'coach_terms_accepted_at', 'SELECT') AS anon_lit,
  has_column_privilege('authenticated', 'public.profiles', 'coach_terms_accepted_at', 'SELECT') AS authenticated_lit,
  EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.profiles'::regclass
      AND tgname = 'trg_protect_coach_terms' AND tgenabled = 'O'
  ) AS trigger_actif;
