import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'

/* POST /api/bookings/complete-past
   Complétion paresseuse : les sessions 'scheduled' dont l'heure est passée
   depuis plus d'une heure basculent en 'completed'. Appelée au chargement du
   planning élève et de l'espace sessions coach — pas besoin de cron, le statut
   est juste au moment où quelqu'un le regarde. Limitée aux bookings de
   l'utilisateur connecté (élève ou coach). */
export async function POST() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const cutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const admin  = createAdminSupabaseClient()

  const { data, error } = await admin
    .from('bookings')
    .update({ status: 'completed' })
    .eq('status', 'scheduled')
    .lt('scheduled_at', cutoff)
    .or(`student_id.eq.${user.id},coach_id.eq.${user.id}`)
    .select('id')

  if (error) {
    console.error('[complete-past]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true, completed: data?.length ?? 0 })
}
