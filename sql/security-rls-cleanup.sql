-- =====================================================================
-- OnlyPok — Nettoyage des policies RLS « étrangères » (2026-09-27)
-- À exécuter APRÈS sql/security-rls.sql, dans Supabase > SQL Editor.
--
-- Pourquoi : les policies Postgres se cumulent (OU logique). Une ancienne
-- policy permissive créée à la main (ex. « lecture pour tous » USING true)
-- annule le verrou posé par security-rls.sql — constaté sur
-- formation_lessons : 6 leçons payantes restaient lisibles sans connexion.
--
-- Ne touche QUE les tables dont security-rls.sql définit l'ensemble complet
-- des policies ; toute autre policy sur ces tables est supprimée.
-- Le résultat affiché liste les policies restantes (contrôle visuel).
-- =====================================================================

BEGIN;

DO $$
DECLARE
  pol RECORD;
  keep CONSTANT text[] := ARRAY[
    'profiles.profiles_select_all', 'profiles.profiles_insert_own', 'profiles.profiles_update_own',
    'formations.formations_select', 'formations.formations_insert_coach',
    'formations.formations_update_own', 'formations.formations_delete_own',
    'formation_chapters.chapters_select', 'formation_chapters.chapters_write_owner',
    'formation_lessons.lessons_select', 'formation_lessons.lessons_write_owner',
    'formation_purchases.purchases_select_own',
    'formation_progress.progress_all_own',
    'reviews.reviews_select_all', 'reviews.reviews_insert_verified',
    'reviews.reviews_update_own', 'reviews.reviews_delete_own',
    'notifications.notif_select_own', 'notifications.notif_update_own', 'notifications.notif_delete_own',
    'coach_proofs.proofs_select', 'coach_proofs.proofs_insert_own',
    'coach_proofs.proofs_update_own', 'coach_proofs.proofs_delete_own',
    'video_comments.vc_select_part', 'video_comments.vc_insert_part',
    'coach_student_notes.csn_all_own'
  ];
BEGIN
  FOR pol IN
    SELECT tablename, policyname FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('profiles', 'formations', 'formation_chapters', 'formation_lessons',
                        'formation_purchases', 'formation_progress', 'reviews', 'notifications',
                        'coach_proofs', 'video_comments', 'coach_student_notes')
      AND (tablename || '.' || policyname) <> ALL (keep)
  LOOP
    RAISE NOTICE 'Suppression policy étrangère : %.%', pol.tablename, pol.policyname;
    EXECUTE format('DROP POLICY %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

COMMIT;

SELECT tablename, policyname, cmd, roles, qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'formations', 'formation_chapters', 'formation_lessons',
                    'formation_purchases', 'formation_progress', 'reviews', 'notifications',
                    'coach_proofs', 'video_comments', 'coach_student_notes')
ORDER BY tablename, policyname;
