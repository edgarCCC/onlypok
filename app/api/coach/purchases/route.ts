import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'

// GET /api/coach/purchases?limit=20
// Returns recent purchases of the coach's formations (bypasses RLS)
export async function GET(req: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const url    = new URL(req.url)
  const limit  = Math.min(Number(url.searchParams.get('limit') ?? '20'), 10000)

  const admin = createAdminSupabaseClient()

  const { data: formations } = await admin
    .from('formations')
    .select('id')
    .eq('coach_id', user.id)

  const formationIds = (formations ?? []).map(f => f.id)
  if (formationIds.length === 0) return NextResponse.json({ purchases: [] })

  const { data: purchases, error } = await admin
    .from('formation_purchases')
    .select('id, created_at, formation_id, amount_paid, net_amount, platform_fee_pct, formations(id, title, content_type, price, cal_url), profiles!user_id(id, username, avatar_url)')
    .in('formation_id', formationIds)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ purchases: purchases ?? [] })
}
