import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { assertAdmin } from '@/lib/assert-admin'

const PROJECT_ID = 'puhflkdcvwoektzlktqh'

const VARIANT_SQL = `
ALTER TABLE formations DROP CONSTRAINT IF EXISTS formations_variant_check;
ALTER TABLE formations ADD CONSTRAINT formations_variant_check
  CHECK (variant IN ('MTT', 'NLH', 'Cash', 'Expresso', 'PLO', 'SNG', 'Heads-Up', 'PKO', 'Autre'));
`

const COMMENTS_SQL = `
ALTER TABLE video_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "vc_select" ON video_comments;
DROP POLICY IF EXISTS "vc_insert" ON video_comments;
DROP POLICY IF EXISTS "vc_delete" ON video_comments;
CREATE POLICY "vc_select" ON video_comments FOR SELECT USING (true);
CREATE POLICY "vc_insert" ON video_comments FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "vc_delete" ON video_comments FOR DELETE USING (auth.uid() = student_id OR auth.uid() = coach_id);
`

const FULL_SQL = VARIANT_SQL + COMMENTS_SQL

export async function GET() {
  if (!await assertAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // 1. Try Supabase Management API (requires SUPABASE_MANAGEMENT_TOKEN)
  const mgmtToken = process.env.SUPABASE_MANAGEMENT_TOKEN
  if (mgmtToken) {
    const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_ID}/database/query`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${mgmtToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: FULL_SQL }),
    })
    const json = await res.json()
    if (res.ok) return NextResponse.json({ ok: true, method: 'management_api' })
    // If management API failed, fall through to next method
    console.error('[migrate] Management API error:', json)
  }

  // 2. Try via supabase-js admin client using rpc (requires exec_sql function in DB)
  try {
    const admin = createAdminSupabaseClient()
    const { error: e1 } = await admin.rpc('exec_sql', { sql: VARIANT_SQL })
    if (!e1) {
      const { error: e2 } = await admin.rpc('exec_sql', { sql: COMMENTS_SQL })
      if (!e2) return NextResponse.json({ ok: true, method: 'rpc_exec_sql' })
    }
  } catch {
    // exec_sql function not available — expected in most setups
  }

  // 3. Return SQL for manual execution in Supabase SQL Editor
  return NextResponse.json({
    ok: false,
    message: 'Migration automatique impossible. Exécute ce SQL dans Supabase SQL Editor :',
    sql: FULL_SQL,
  }, { status: 200 })
}
