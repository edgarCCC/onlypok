-- Extrait de app/api/migrate/tracker-v2/route.ts (constante TRACKER_V2_SQL), déjà exécuté le cas échéant.
-- Conservé pour l'historique : vérifier l'état de la base avant toute réexécution.

CREATE TABLE IF NOT EXISTS tracker_settings (
  user_id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  initial_bankroll NUMERIC(12,2) NOT NULL DEFAULT 0,
  updated_at       TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE tracker_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tset_select_own" ON tracker_settings;
DROP POLICY IF EXISTS "tset_insert_own" ON tracker_settings;
DROP POLICY IF EXISTS "tset_update_own" ON tracker_settings;
CREATE POLICY "tset_select_own" ON tracker_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "tset_insert_own" ON tracker_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tset_update_own" ON tracker_settings FOR UPDATE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS tracker_transactions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date       DATE NOT NULL,
  type       TEXT NOT NULL CHECK (type IN ('deposit','withdrawal')),
  amount     NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  room       TEXT,
  notes      TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tracker_transactions_user_idx ON tracker_transactions(user_id, date);
ALTER TABLE tracker_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ttx_select_own" ON tracker_transactions;
DROP POLICY IF EXISTS "ttx_insert_own" ON tracker_transactions;
DROP POLICY IF EXISTS "ttx_delete_own" ON tracker_transactions;
CREATE POLICY "ttx_select_own" ON tracker_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ttx_insert_own" ON tracker_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ttx_delete_own" ON tracker_transactions FOR DELETE USING (auth.uid() = user_id);
