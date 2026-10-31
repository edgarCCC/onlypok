-- =====================================================================
-- OnlyPok — N3 : garde SQL contre l'auto-attribution du rôle coach.
-- OPTIONNEL (défense en profondeur). À exécuter par Edgar dans
-- Supabase > SQL Editor > Run. Idempotent, réexécutable.
--
-- ORDRE DE DÉPLOIEMENT (à respecter) :
--   1. sql/coach-terms.sql (avant le déploiement du code).
--   2. Déployer le code N3 en production : StudentHeader et /become-coach
--      passent par POST /api/coach/apply, qui écrit en service role ; le
--      navigateur n'écrit plus jamais role = 'coach'.
--   3. Tester en prod : un compte élève devient coach via /become-coach.
--      Cela crée au moins une ligne role = 'coach' avec
--      coach_terms_accepted_at renseigné : c'est le verrou vérifié ci-dessous.
--   4. Lancer CE fichier, seul.
--   Lancé AVANT le déploiement, l'ancien code (update client du rôle dans
--   StudentHeader, upsert visiteur avec role = 'coach') échouerait avec
--   « Attribution du rôle coach interdite » : plus personne ne pourrait
--   devenir coach jusqu'au déploiement. Le bloc DO ci-dessous refuse donc
--   de s'exécuter tant qu'aucun coach n'a été créé par la route.
--
-- CE QUE ÇA CHANGE :
--   - Depuis un client anon/authenticated (supabase-js, PostgREST, console
--     du navigateur), il devient impossible d'insérer un profil avec
--     role = 'coach' ou de faire passer un profil de student à coach : le
--     trigger lève une exception 42501 (PostgREST répond 403). La policy
--     RLS profiles_update_own reste inchangée.
--   - Le service role (routes serveur, dont /api/coach/apply et /api/admin/*,
--     SQL Editor, migrations) et supabase_auth_admin ne sont pas concernés :
--     même liste de rôles privilégiés que protect_privileged_profile_columns().
--   - Coach existant : un UPDATE client qui laisse role = 'coach' inchangé
--     passe (OLD.role est déjà 'coach') ; le trigger ne se déclenche que si
--     la colonne role figure dans le SET. En revanche un upsert client
--     portant role = 'coach' sur un profil existant est REFUSÉ : BEFORE
--     INSERT se déclenche avant la détection du conflit, donc TG_OP vaut
--     'INSERT'. Sans effet avec le code N3 : les seuls upserts client de
--     profiles (register, become-coach) créent en 'student' ; seul l'ancien
--     become-coach portait role = 'coach'.
--   - Fonction et trigger SÉPARÉS du garde admin (protect_privileged_profile_
--     columns / trg_protect_profile_privs) : si sql/security-rls.sql (source
--     de vérité, réexécutable) est relancé un jour, il remplace sa propre
--     fonction sans effacer celle-ci.
--
-- RETOUR ARRIÈRE :
--   DROP TRIGGER IF EXISTS trg_protect_coach_role ON public.profiles;
--   DROP FUNCTION IF EXISTS public.protect_coach_role();
--
-- Jamais les deux fichiers d'un coup : sql/coach-terms.sql d'abord (avant le
-- déploiement) ; ce fichier seul, après déploiement et test.
-- =====================================================================

BEGIN;
SET LOCAL lock_timeout = '5s';

-- Verrou de déploiement par les données : refuse de poser le garde tant
-- qu'aucun élève n'est passé coach via /api/coach/apply (preuve :
-- coach_terms_accepted_at renseigné). Une erreur « column
-- coach_terms_accepted_at does not exist » signifie : lancer d'abord
-- sql/coach-terms.sql.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE role = 'coach' AND coach_terms_accepted_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Verrou N3 : aucun élève passé coach via /api/coach/apply. Déploie le code, teste /become-coach avec un compte élève, puis relance.';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.protect_coach_role()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  -- Rôles privilégiés : identiques à protect_privileged_profile_columns()
  IF current_user IN ('service_role', 'supabase_admin', 'postgres', 'supabase_auth_admin') THEN
    RETURN NEW;
  END IF;
  -- Personne ne s'attribue le rôle coach depuis le client : le passage
  -- élève → coach se fait via POST /api/coach/apply (acceptation des
  -- conditions, horodatage, service role).
  IF NEW.role = 'coach' AND (TG_OP = 'INSERT' OR OLD.role IS DISTINCT FROM 'coach') THEN
    RAISE EXCEPTION 'Attribution du rôle coach interdite : passe par la page Devenir coach'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_protect_coach_role ON public.profiles;
CREATE TRIGGER trg_protect_coach_role
  BEFORE INSERT OR UPDATE OF role ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_coach_role();

COMMIT;

-- Vérification : doit renvoyer 1 ligne, tgenabled = 'O'
SELECT tgname, tgenabled
FROM pg_trigger
WHERE tgrelid = 'public.profiles'::regclass
  AND tgname = 'trg_protect_coach_role';

-- Test manuel facultatif, dans une transaction annulée. BEGIN d'abord :
-- sans lui, SET LOCAL ROLE est ignoré, l'UPDATE s'exécuterait en postgres
-- et promouvrait réellement le compte. Attendu : erreur 42501.
--   BEGIN;
--   SET LOCAL ROLE authenticated;
--   SELECT set_config('request.jwt.claims',
--     '{"sub":"<uuid d''un compte élève de test>","role":"authenticated"}', true);
--   UPDATE public.profiles SET role = 'coach' WHERE id = '<le même uuid>';
--   ROLLBACK;
