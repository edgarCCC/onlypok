import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { assertAdmin } from '@/lib/assert-admin'

const PROJECT_ID = 'puhflkdcvwoektzlktqh'

/* Tracker v2 — bankroll unifiée :
   - tracker_settings     : bankroll initiale persistée (1 ligne par user)
   - tracker_transactions : dépôts / retraits */
const TRACKER_V2_SQL = `
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
`

export async function GET() {
  if (!await assertAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // 1. Supabase Management API (si SUPABASE_MANAGEMENT_TOKEN présent)
  const mgmtToken = process.env.SUPABASE_MANAGEMENT_TOKEN
  if (mgmtToken) {
    const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_ID}/database/query`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${mgmtToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: TRACKER_V2_SQL }),
    })
    const json = await res.json()
    if (res.ok) return NextResponse.json({ ok: true, method: 'management_api' })
    console.error('[migrate/tracker-v2] Management API error:', json)
  }

  // 2. RPC exec_sql si la fonction existe en base
  try {
    const admin = createAdminSupabaseClient()
    const { error } = await admin.rpc('exec_sql', { sql: TRACKER_V2_SQL })
    if (!error) return NextResponse.json({ ok: true, method: 'rpc_exec_sql' })
  } catch {
    // fonction absente — attendu
  }

  // 3. Fallback : SQL à exécuter manuellement dans Supabase SQL Editor
  return NextResponse.json({
    ok: false,
    message: 'Migration automatique impossible. Exécute ce SQL dans Supabase SQL Editor :',
    sql: TRACKER_V2_SQL,
  }, { status: 200 })
}
