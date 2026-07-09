import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { assertAdmin } from '@/lib/assert-admin'
import { decryptPaymentField } from '@/lib/crypto'

/* Vue admin des profils coachs.
   GET /api/admin/coaches            → liste + compteurs (formations, preuves)
   GET /api/admin/coaches?id=<uuid>  → détail complet, coordonnées de paiement déchiffrées */

const LIST_FIELDS =
  'id, username, email, avatar_url, created_at, is_pro, years_experience, phone, ' +
  'city, country, is_company, company_name, siret, vat_number, preferred_payment'

export async function GET(req: Request) {
  const user = await assertAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminSupabaseClient()
  const { searchParams } = new URL(req.url)
  const coachId = searchParams.get('id')

  /* ── Détail d'un coach (avec paiement déchiffré) ── */
  if (coachId) {
    const { data: profile, error } = await admin
      .from('profiles')
      .select('*')
      .eq('id', coachId)
      .single()

    if (error || !profile) {
      return NextResponse.json({ error: error?.message ?? 'Coach introuvable' }, { status: 404 })
    }

    return NextResponse.json({
      coach: {
        ...profile,
        iban:           decryptPaymentField(profile.iban),
        paypal_email:   decryptPaymentField(profile.paypal_email),
        stripe_account: decryptPaymentField(profile.stripe_account),
        revolut_tag:    decryptPaymentField(profile.revolut_tag),
        payment_notes:  decryptPaymentField(profile.payment_notes),
      },
    })
  }

  /* ── Liste des coachs + compteurs ── */
  const [coachesRes, formationsRes, proofsRes] = await Promise.all([
    admin.from('profiles').select(LIST_FIELDS).eq('role', 'coach').order('created_at', { ascending: false })
      .returns<Record<string, unknown>[]>(),
    admin.from('formations').select('coach_id'),
    admin.from('coach_proofs').select('coach_id, validation_status'),
  ])

  if (coachesRes.error) {
    return NextResponse.json({ error: coachesRes.error.message }, { status: 500 })
  }

  const formationCounts: Record<string, number> = {}
  for (const f of formationsRes.data ?? []) {
    if (f.coach_id) formationCounts[f.coach_id] = (formationCounts[f.coach_id] ?? 0) + 1
  }

  const proofCounts: Record<string, { pending: number; approved: number; rejected: number }> = {}
  for (const p of proofsRes.data ?? []) {
    if (!p.coach_id) continue
    const c = (proofCounts[p.coach_id] ??= { pending: 0, approved: 0, rejected: 0 })
    if (p.validation_status === 'pending')  c.pending++
    if (p.validation_status === 'approved') c.approved++
    if (p.validation_status === 'rejected') c.rejected++
  }

  const coaches = (coachesRes.data ?? []).map((c: Record<string, unknown>) => ({
    ...c,
    formations_count: formationCounts[c.id as string] ?? 0,
    proofs: proofCounts[c.id as string] ?? { pending: 0, approved: 0, rejected: 0 },
  }))

  return NextResponse.json({ coaches })
}
