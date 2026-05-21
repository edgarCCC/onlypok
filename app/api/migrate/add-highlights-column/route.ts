import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'

const PROJECT_ID = 'puhflkdcvwoektzlktqh'

const SQL = `
ALTER TABLE formations ADD COLUMN IF NOT EXISTS highlights jsonb DEFAULT NULL;
`

export async function GET() {
  const mgmtToken = process.env.SUPABASE_MANAGEMENT_TOKEN
  if (mgmtToken) {
    try {
      const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_ID}/database/query`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${mgmtToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: SQL }),
      })
      if (res.ok) return NextResponse.json({ ok: true, method: 'management_api' })
    } catch { /* fall through */ }
  }

  try {
    const admin = createAdminSupabaseClient()
    const { error } = await admin.rpc('exec_sql', { sql: SQL })
    if (!error) return NextResponse.json({ ok: true, method: 'rpc_exec_sql' })
  } catch { /* exec_sql not available */ }

  return NextResponse.json({ ok: false, message: 'Token de gestion requis. Exécute ce SQL manuellement.', sql: SQL.trim() }, { status: 200 })
}
