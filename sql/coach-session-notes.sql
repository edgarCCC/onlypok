-- =====================================================================
-- OnlyPok — Notes de séance du coach (2026-10-21)
-- L'Agenda coach (onglet Historique) enregistre des notes par séance dans
-- coaching_sessions, mais la table n'avait pas ces colonnes : les notes
-- n'ont jamais été sauvegardées. À exécuter dans Supabase > SQL Editor.
-- Idempotent. Tout-ou-rien (transaction).
-- =====================================================================
BEGIN;

ALTER TABLE coaching_sessions
  ADD COLUMN IF NOT EXISTS notes          TEXT    NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS tags           TEXT[]  NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS progress_score INTEGER CHECK (progress_score BETWEEN 1 AND 10);

-- Une seule fiche de notes par réservation
CREATE UNIQUE INDEX IF NOT EXISTS coaching_sessions_booking_uidx
  ON coaching_sessions(booking_id) WHERE booking_id IS NOT NULL;

-- RLS : le coach gère les notes de SES séances ; l'élève peut les lire.
ALTER TABLE coaching_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "csess_select_parties" ON coaching_sessions;
DROP POLICY IF EXISTS "csess_insert_coach"   ON coaching_sessions;
DROP POLICY IF EXISTS "csess_update_coach"   ON coaching_sessions;
CREATE POLICY "csess_select_parties" ON coaching_sessions FOR SELECT
  USING (auth.uid() = coach_id OR auth.uid() = student_id);
CREATE POLICY "csess_insert_coach" ON coaching_sessions FOR INSERT
  WITH CHECK (
    auth.uid() = coach_id
    AND EXISTS (SELECT 1 FROM bookings b WHERE b.id = booking_id AND b.coach_id = auth.uid())
  );
CREATE POLICY "csess_update_coach" ON coaching_sessions FOR UPDATE
  USING (auth.uid() = coach_id) WITH CHECK (auth.uid() = coach_id);

COMMIT;
