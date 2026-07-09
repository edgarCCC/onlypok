import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { assertAdmin } from '@/lib/assert-admin'
import { sendCoachProofReviewedEmail } from '@/lib/email'

/* Libellés catégories — mêmes clés que l'écran de validation */
const CAT_LABELS: Record<string, string> = {
  stats:      'Stats officielles',
  longterme:  'Long terme',
  perf:       'Meilleures perfs',
  eleves:     'Transformations élèves',
  sharkscope: 'SharkScope',
  pokerstats: 'PokerStats / HM3',
  palmares:   'Palmarès',
}

/* Les opérations passent par le client service-role : le client session (RLS)
   ne voit/modifie pas les preuves des autres users — un update RLS-bloqué
   touche 0 ligne sans erreur, d'où des validations qui semblaient "perdues". */

// GET /api/admin/proofs?status=pending  → list proofs
export async function GET(req: Request) {
  const user = await assertAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') ?? 'pending'

  const admin = createAdminSupabaseClient()
  const { data, error } = await admin
    .from('coach_proofs')
    .select('*, coach:profiles!coach_id(id, username, avatar_url)')
    .eq('validation_status', status)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ proofs: data })
}

// POST /api/admin/proofs  → { proofId, status: 'approved'|'rejected', reason? }
export async function POST(req: Request) {
  const user = await assertAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { proofId, status, reason } = await req.json()
  if (!proofId || !['approved', 'rejected'].includes(status)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const admin = createAdminSupabaseClient()
  const { data, error } = await admin
    .from('coach_proofs')
    .update({
      validation_status: status,
      rejection_reason: reason ?? null,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', proofId)
    .select('id, coach_id, category')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data || data.length === 0) {
    return NextResponse.json({ error: 'Preuve introuvable — aucune ligne modifiée' }, { status: 404 })
  }

  /* Prévenir le coach : notification in-app + email (non bloquants) */
  const proof = data[0]
  if (proof.coach_id) {
    const categoryLabel = CAT_LABELS[proof.category] ?? proof.category ?? 'Preuve'
    const isApproved = status === 'approved'

    const { error: notifError } = await admin.from('notifications').insert({
      user_id: proof.coach_id,
      type:    isApproved ? 'proof_validated' : 'proof_rejected',
      title:   isApproved ? 'Preuve validée ✓' : 'Preuve refusée',
      body:    isApproved
        ? `Votre preuve "${categoryLabel}" a été vérifiée : elle est maintenant visible sur votre profil public.`
        : `Votre preuve "${categoryLabel}" n'a pas été validée.${reason ? ` Motif : ${reason}` : ''} Vous pouvez en soumettre une nouvelle depuis votre profil.`,
      data:    { proof_id: proof.id, category: proof.category ?? '' },
    })
    if (notifError) console.error('[admin/proofs] notification insert failed:', notifError.message)

    sendCoachProofReviewedEmail({
      coachId: proof.coach_id,
      status,
      categoryLabel,
      reason: reason ?? null,
    }).catch((err: unknown) => console.error('[admin/proofs] email error:', err instanceof Error ? err.message : err))
  }

  return NextResponse.json({ ok: true })
}
