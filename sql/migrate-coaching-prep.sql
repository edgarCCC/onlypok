-- Extrait de app/api/migrate/coaching-prep/route.ts (constante SQL), déjà exécuté le cas échéant.
-- Conservé pour l'historique : vérifier l'état de la base avant toute réexécution.

CREATE TABLE IF NOT EXISTS coaching_prep (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id     UUID REFERENCES bookings(id) ON DELETE CASCADE,
  student_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  questions      JSONB       NOT NULL DEFAULT '[]',
  hand_histories JSONB       NOT NULL DEFAULT '[]',
  prep_notes     TEXT        NOT NULL DEFAULT '',
  session_notes  TEXT        NOT NULL DEFAULT '',
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(booking_id, student_id)
);
CREATE INDEX IF NOT EXISTS coaching_prep_student_idx ON coaching_prep(student_id);
CREATE INDEX IF NOT EXISTS coaching_prep_booking_idx ON coaching_prep(booking_id);
ALTER TABLE coaching_prep ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cp_select_own" ON coaching_prep;
DROP POLICY IF EXISTS "cp_all_own"    ON coaching_prep;
CREATE POLICY "cp_select_own" ON coaching_prep FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "cp_all_own"    ON coaching_prep FOR ALL    USING (auth.uid() = student_id) WITH CHECK (auth.uid() = student_id);
