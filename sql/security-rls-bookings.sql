-- =====================================================================
-- OnlyPok — bookings en lecture seule côté client (2026-09-27)
-- À exécuter dans Supabase > SQL Editor (après security-rls + cleanup).
--
-- Constaté : un élève connecté pouvait encore INSÉRER une réservation
-- « scheduled » à 0 € (policy INSERT résiduelle créée hors migrations), et
-- modifier status/prix de sa ligne via la policy UPDATE.
-- Toutes les écritures légitimes passent par le serveur en service-role
-- (lib/bookings.ts, /api/bookings/*) : on retire donc TOUTE écriture client.
-- Les participants (élève / coach) gardent la lecture de leurs réservations.
-- =====================================================================

BEGIN;

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'bookings' AND policyname <> 'bookings_select_own'
  LOOP
    RAISE NOTICE 'Suppression policy bookings : %', pol.policyname;
    EXECUTE format('DROP POLICY %I ON public.bookings', pol.policyname);
  END LOOP;
END $$;

DROP POLICY IF EXISTS "bookings_select_own" ON bookings;
CREATE POLICY "bookings_select_own" ON bookings FOR SELECT
  USING (auth.uid() = student_id OR auth.uid() = coach_id);

COMMIT;

SELECT policyname, cmd, qual, with_check FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'bookings';
