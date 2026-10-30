-- =====================================================================
-- OnlyPok — R12 : RLS des avis durcie (2026-10-29)
-- À exécuter dans Supabase > SQL Editor. Idempotent. Tout-ou-rien.
--
-- ORDRE D'EXÉCUTION
--   1. sql/security-rls.sql + sql/security-rls-cleanup.sql (déjà faits)
--   2. sql/formation-purchases-ledger.sql (R10) — conseillé avant, pas
--      obligatoire : la policy ci-dessous marche avec 1 ou N lignes d'achat.
--   3. CE FICHIER — UNIQUEMENT APRÈS le déploiement du code qui envoie
--      reviews.formation_id à l'insertion (FormationDetailClient.tsx,
--      submitReview). Sans ce champ, tout avis formation / vidéo est refusé
--      (erreur 42501, message lisible côté UI mais avis impossible).
--
-- AVANT (sql/security-rls.sql l. 191) : un avis passait dès qu'il existait
--   un booking avec le coach, QUEL QUE SOIT son statut (refusé, annulé,
--   jamais payé…), ou l'achat de N'IMPORTE QUELLE formation du coach.
--
-- APRÈS
--   - Avis coaching (content_type = 'coaching') : il faut au moins un
--     booking 'completed' entre cet élève et ce coach.
--   - Avis formation / vidéo : il faut l'achat de CETTE formation
--     (reviews.formation_id), qui appartient bien à ce coach et dont le
--     type correspond au content_type de l'avis.
--     >>> RÈGLE PAR DÉFAUT — À CONFIRMER PAR EDGAR. <<<
--     Variante plus souple (achat de n'importe quel contenu du même type
--     chez ce coach) fournie en commentaire plus bas.
--   - La policy UPDATE re-vérifie les mêmes conditions : avant, un élève
--     pouvait modifier coach_id de son avis pour le déplacer vers un autre
--     coach sans aucun achat.
--
-- Rappel : l'unicité (student_id, coach_id, content_type) posée par
-- security-rls.sql est conservée (un avis par élève, par coach et par type).
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1. Colonne formation_id : rattache un avis formation / vidéo au contenu
--    acheté. NULL pour les avis coaching et pour les avis historiques.
--    ON DELETE SET NULL : supprimer une formation ne supprime pas l'avis
--    (il reste visible sur le profil du coach).
-- ---------------------------------------------------------------------
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS formation_id UUID REFERENCES public.formations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS reviews_formation_idx ON public.reviews (formation_id);

-- Index utilisé par la sous-requête coaching de la policy
-- (student_id, coach_id) filtré sur les séances terminées.
CREATE INDEX IF NOT EXISTS bookings_student_coach_completed_idx
  ON public.bookings (student_id, coach_id)
  WHERE status = 'completed';

-- formation_purchases(user_id, formation_id) est indexé par
-- formation-purchases-ledger.sql (R10). Si R10 n'est pas encore passé,
-- l'ancienne contrainte UNIQUE(formation_id, user_id) joue ce rôle.

-- ---------------------------------------------------------------------
-- 2. Policies
-- ---------------------------------------------------------------------
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reviews_insert_verified" ON public.reviews;
CREATE POLICY "reviews_insert_verified" ON public.reviews
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = student_id
    AND (
      -- Avis coaching : au moins une séance TERMINÉE avec ce coach
      (
        content_type = 'coaching'
        AND EXISTS (
          SELECT 1 FROM public.bookings b
          WHERE b.student_id = (SELECT auth.uid())
            AND b.coach_id   = reviews.coach_id
            AND b.status     = 'completed'
        )
      )
      OR
      -- Avis formation / vidéo : achat de CETTE formation (règle à confirmer)
      (
        COALESCE(content_type, 'formation') <> 'coaching'
        AND formation_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.formation_purchases fp
          JOIN public.formations f ON f.id = fp.formation_id
          WHERE fp.user_id      = (SELECT auth.uid())
            AND fp.formation_id = reviews.formation_id
            AND f.coach_id      = reviews.coach_id
            AND COALESCE(f.content_type, 'formation') = COALESCE(reviews.content_type, 'formation')
        )
      )
      -- VARIANTE SOUPLE (si Edgar préfère « un achat chez ce coach ») :
      -- remplacer le bloc ci-dessus par :
      -- (
      --   COALESCE(content_type, 'formation') <> 'coaching'
      --   AND EXISTS (
      --     SELECT 1 FROM public.formation_purchases fp
      --     JOIN public.formations f ON f.id = fp.formation_id
      --     WHERE fp.user_id = (SELECT auth.uid())
      --       AND f.coach_id = reviews.coach_id
      --       AND COALESCE(f.content_type, 'formation') = COALESCE(reviews.content_type, 'formation')
      --   )
      -- )
    )
  );

-- UPDATE : l'élève peut corriger sa note / son commentaire, mais la ligne
-- modifiée doit rester éligible (pas de changement de coach ou de type
-- vers un contenu non acheté).
DROP POLICY IF EXISTS "reviews_update_own" ON public.reviews;
CREATE POLICY "reviews_update_own" ON public.reviews
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = student_id)
  WITH CHECK (
    (SELECT auth.uid()) = student_id
    AND (
      (
        content_type = 'coaching'
        AND EXISTS (
          SELECT 1 FROM public.bookings b
          WHERE b.student_id = (SELECT auth.uid())
            AND b.coach_id   = reviews.coach_id
            AND b.status     = 'completed'
        )
      )
      OR
      (
        COALESCE(content_type, 'formation') <> 'coaching'
        AND (
          -- avis historique sans formation_id : modifiable tant que ni le
          -- coach ni le type ne changent vers un contenu non acheté
          (formation_id IS NULL AND EXISTS (
            SELECT 1 FROM public.formation_purchases fp
            JOIN public.formations f ON f.id = fp.formation_id
            WHERE fp.user_id = (SELECT auth.uid())
              AND f.coach_id = reviews.coach_id
              AND COALESCE(f.content_type, 'formation') = COALESCE(reviews.content_type, 'formation')
          ))
          OR EXISTS (
            SELECT 1 FROM public.formation_purchases fp
            JOIN public.formations f ON f.id = fp.formation_id
            WHERE fp.user_id      = (SELECT auth.uid())
              AND fp.formation_id = reviews.formation_id
              AND f.coach_id      = reviews.coach_id
              AND COALESCE(f.content_type, 'formation') = COALESCE(reviews.content_type, 'formation')
          )
        )
      )
    )
  );

-- SELECT (public) et DELETE (auteur) inchangés, recréés à l'identique pour
-- que ce fichier soit autonome.
DROP POLICY IF EXISTS "reviews_select_all" ON public.reviews;
CREATE POLICY "reviews_select_all" ON public.reviews FOR SELECT USING (true);

DROP POLICY IF EXISTS "reviews_delete_own" ON public.reviews;
CREATE POLICY "reviews_delete_own" ON public.reviews
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = student_id);

COMMIT;


-- ---------------------------------------------------------------------
-- 3. VÉRIFICATION — policies en place
-- ---------------------------------------------------------------------
SELECT policyname, cmd, roles, with_check IS NOT NULL AS a_with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'reviews'
ORDER BY policyname;


-- ---------------------------------------------------------------------
-- 4. SONDE DE TEST (compte jetable) — à faire depuis l'application ou
--    via l'API REST avec le JWT d'un compte de test SANS achat :
--
--    POST /rest/v1/reviews
--      { "coach_id": "<un coach>", "student_id": "<id du compte test>",
--        "rating": 5, "content_type": "formation",
--        "formation_id": "<une formation non achetée>" }
--    => attendu : 403, code 42501 (new row violates row-level security)
--
--    Même test avec "content_type": "coaching" et un compte dont le
--    booking avec ce coach n'est pas 'completed' => 42501 attendu.
--
--    Variante SQL Editor (simulation d'un utilisateur) :
--    BEGIN;
--      SET LOCAL ROLE authenticated;
--      SELECT set_config('request.jwt.claims',
--        '{"sub":"<uuid du compte test>","role":"authenticated"}', true);
--      INSERT INTO public.reviews (coach_id, student_id, rating, content_type, formation_id)
--      VALUES ('<coach>', '<uuid du compte test>', 5, 'formation', '<formation non achetée>');
--      -- => ERROR: new row violates row-level security policy for table "reviews"
--    ROLLBACK;
-- ---------------------------------------------------------------------
