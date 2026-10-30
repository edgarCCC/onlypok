-- =====================================================================
-- OnlyPok — R4 : anti double-réservation EN BASE (2026-10-29)
-- À exécuter dans Supabase > SQL Editor. Idempotent.
--
-- ORDRE D'EXÉCUTION
--   Indépendant des autres migrations du sprint S1, mais à exécuter
--   APRÈS le déploiement du code R4 : seul le nouveau code gère l'erreur
--   23505 renvoyée par cet index (409 dans /api/bookings/confirm-slot,
--   repli en 'paid_pending_schedule' dans lib/bookings.ts après paiement).
--   Avec l'ancien code, une course entre deux paiements ferait sauter la
--   création de la séance (paiement encaissé sans booking).
--
-- POURQUOI
--   La vérification de conflit se faisait en « lecture puis écriture »
--   (confirm-slot, ensureCoachingBookings) : deux élèves qui valident le
--   même créneau au même instant passaient tous les deux. Un index unique
--   partiel rend la collision impossible côté base.
--
-- STATUTS COUVERTS (vérifiés dans le code)
--   'scheduled'              : séance confirmée (résa instantanée ou acceptée)
--   'pending_coach_approval' : créneau proposé, en attente du coach
--   Non couverts : 'paid_pending_schedule' (pas de créneau), 'completed',
--   'declined_by_coach', 'cancelled', 'refunded' — un créneau refusé ou
--   annulé redevient libre.
--
-- NOM DE L'INDEX : bookings_coach_slot_active_uniq
--   Ce nom est testé dans lib/bookings.ts (distinction avec un éventuel
--   doublon de stripe_session_id). Ne pas le renommer sans adapter le code.
-- =====================================================================


-- ---------------------------------------------------------------------
-- ÉTAPE 1 — CONTRÔLE DES DOUBLONS EXISTANTS (lecture seule)
-- À lancer SEUL d'abord (sélectionner ces lignes puis « Run ») : le SQL
-- Editor n'affiche que le résultat de la dernière requête.
-- Résultat attendu : 0 ligne. Sinon, chaque ligne = un créneau pris deux
-- fois ; garder la réservation légitime (la plus ancienne en général) et
-- passer les autres en 'paid_pending_schedule' avec scheduled_at = NULL
-- (l'élève re-choisira un créneau), APRÈS avoir prévenu les élèves.
-- ---------------------------------------------------------------------
SELECT
  coach_id,
  scheduled_at,
  count(*)                                   AS nb,
  array_agg(id         ORDER BY created_at)  AS booking_ids,
  array_agg(student_id ORDER BY created_at)  AS student_ids,
  array_agg(status     ORDER BY created_at)  AS statuts
FROM public.bookings
WHERE status IN ('scheduled', 'pending_coach_approval')
  AND coach_id     IS NOT NULL
  AND scheduled_at IS NOT NULL
GROUP BY coach_id, scheduled_at
HAVING count(*) > 1
ORDER BY scheduled_at;

-- Exemple de correction manuelle (à adapter, NE PAS lancer tel quel) :
-- UPDATE public.bookings
--    SET status = 'paid_pending_schedule', scheduled_at = NULL
--  WHERE id = '<id de la réservation en double>';


-- ---------------------------------------------------------------------
-- ÉTAPE 2 — POSE DE L'INDEX (tout-ou-rien)
-- La garde refuse d'aller plus loin s'il reste des doublons, avec la
-- liste dans le message d'erreur. Rien n'est modifié dans ce cas.
--
-- Pas de CONCURRENTLY : il est interdit dans une transaction et dans un
-- script multi-requêtes du SQL Editor. La table bookings est petite, le
-- verrou d'écriture pendant la création dure une fraction de seconde.
-- ---------------------------------------------------------------------
BEGIN;

DO $$
DECLARE
  dups TEXT;
BEGIN
  SELECT string_agg(format('coach %s @ %s (%s réservations)', coach_id, scheduled_at, nb), E'\n')
    INTO dups
  FROM (
    SELECT coach_id, scheduled_at, count(*) AS nb
    FROM public.bookings
    WHERE status IN ('scheduled', 'pending_coach_approval')
      AND coach_id IS NOT NULL AND scheduled_at IS NOT NULL
    GROUP BY coach_id, scheduled_at
    HAVING count(*) > 1
  ) d;

  IF dups IS NOT NULL THEN
    RAISE EXCEPTION E'Doublons de créneaux à corriger avant de poser l''index (voir ÉTAPE 1) :\n%', dups;
  END IF;
END $$;

-- Un seul booking actif par (coach, horaire). Les NULL (coach ou horaire
-- absents) ne se bloquent pas entre eux : comportement voulu.
-- L'index sert aussi les requêtes de conflit du code
-- (.eq coach_id / .eq scheduled_at / .in status) et /api/bookings/taken-slots.
CREATE UNIQUE INDEX IF NOT EXISTS bookings_coach_slot_active_uniq
  ON public.bookings (coach_id, scheduled_at)
  WHERE status IN ('scheduled', 'pending_coach_approval');

COMMIT;


-- ---------------------------------------------------------------------
-- ÉTAPE 3 — VÉRIFICATION
-- Attendu : une ligne, indexdef contenant « UNIQUE » et le WHERE status.
-- ---------------------------------------------------------------------
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'bookings'
  AND indexname = 'bookings_coach_slot_active_uniq';


-- ---------------------------------------------------------------------
-- RETOUR ARRIÈRE (si besoin uniquement)
-- DROP INDEX IF EXISTS public.bookings_coach_slot_active_uniq;
-- ---------------------------------------------------------------------
