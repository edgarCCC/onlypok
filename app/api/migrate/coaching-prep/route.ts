import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/assert-admin'

const PROJECT_ID = 'puhflkdcvwoektzlktqh'

const SQL = `
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
`

export async function GET() {
  if (!await assertAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const mgmtToken = process.env.SUPABASE_MANAGEMENT_TOKEN
  if (!mgmtToken) {
    return NextResponse.json({
      message: 'Pas de SUPABASE_MANAGEMENT_TOKEN. Exécute ce SQL manuellement dans Supabase :',
      sql: SQL,
    })
  }

  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_ID}/database/query`, {
    method:  'POST',
    headers: { Authorization: `Bearer ${mgmtToken}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify({ query: SQL }),
  })

  const json = await res.json()
  if (!res.ok) return NextResponse.json({ error: json }, { status: 500 })
  return NextResponse.json({ ok: true })
}
