import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'
import { sendCoachSlotConfirmedEmail, sendStudentSlotConfirmedEmail } from '@/lib/email'
import { isSlotConflictError } from '@/lib/bookings'
import { validateSlot, supabaseSlotStore, SLOT_REJECTION_HTTP } from '@/lib/slots'
import { object, readJsonBody, string, uuid } from '@/lib/validate'

// POST /api/bookings/confirm-slot
// Body: { booking_id, scheduled_at }
// Student proposes a time slot → status becomes pending_coach_approval
// Coach then accepts (captures Stripe, generates Jitsi link) or declines

// Q11 : type et longueur seulement — le format ISO strict, le délai, la grille et
// les disponibilités restent à validateSlot (R3), sans doublon.
const ConfirmSlotBody = object({ booking_id: uuid(), scheduled_at: string({ min: 1, max: 64 }) })

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const body = await readJsonBody(req, ConfirmSlotBody, { tag: 'bookings/confirm-slot' })
  if (!body.ok) return body.response
  const { booking_id, scheduled_at } = body.data

  // Verify ownership and current status
  const { data: booking } = await supabase
    .from('bookings')
    .select('id, student_id, coach_id, formation_id, status')
    .eq('id', booking_id)
    .eq('student_id', user.id)
    .eq('status', 'paid_pending_schedule')
    .single()

  if (!booking) {
    return NextResponse.json({ error: 'Booking not found or already scheduled' }, { status: 404 })
  }

  // R3 — validation serveur du créneau AVANT toute écriture : ISO strict, délai
  // minimal, grille et disponibilités du coach (fuseau Paris), créneau déjà pris.
  // Service-role : la RLS cache à l'élève les réservations des autres élèves,
  // un client user-scoped ne verrait donc jamais le conflit.
  const admin = createAdminSupabaseClient()
  if (!booking.coach_id) {
    console.error('[confirm-slot] réservation sans coach_id, créneau refusé', { booking_id, userId: user.id })
    return NextResponse.json({ error: 'Cette réservation n’a pas de coach associé : contacte le support.' }, { status: 400 })
  }
  let slot: Awaited<ReturnType<typeof validateSlot>>
  try {
    slot = await validateSlot(
      { coachId: booking.coach_id, scheduledAt: scheduled_at, excludeBookingId: booking_id },
      supabaseSlotStore(admin),
    )
  } catch (err) {
    console.error('[confirm-slot] vérification du créneau impossible:', (err as Error).message)
    return NextResponse.json({ error: 'Vérification du créneau impossible, réessaie.' }, { status: 500 })
  }
  if (!slot.ok) {
    console.warn('[confirm-slot] créneau refusé', { booking_id, scheduled_at: String(scheduled_at).slice(0, 64), reason: slot.reason, userId: user.id })
    const { status, message } = SLOT_REJECTION_HTTP[slot.reason]
    return NextResponse.json({ error: message, code: slot.reason }, { status })
  }
  const scheduledAt = slot.scheduledAt

  // Move to pending_coach_approval with the proposed slot (écriture service-role :
  // aucune écriture client n'est autorisée sur bookings — RLS)
  const { data: updated, error } = await admin
    .from('bookings')
    .update({ status: 'pending_coach_approval', scheduled_at: scheduledAt })
    .eq('id', booking_id)
    .eq('status', 'paid_pending_schedule')
    .select('id')

  // 23505 sur l'index unique bookings_coach_slot_active_uniq : un autre élève a
  // pris ce créneau entre la vérification ci-dessus et l'écriture (course).
  if (isSlotConflictError(error)) {
    return NextResponse.json({ error: 'Ce créneau vient d’être réservé par un autre élève. Choisissez-en un autre.' }, { status: 409 })
  }
  if (error) {
    console.error('[confirm-slot] update failed:', { booking_id, error: error.message })
    return NextResponse.json({ error: 'Enregistrement du créneau impossible, réessaie.' }, { status: 500 })
  }
  // Requête concurrente (double clic, réservation déjà planifiée entre-temps) :
  // aucune ligne modifiée, donc ni notification ni email.
  if (!updated?.length) {
    return NextResponse.json({ error: 'Cette réservation a déjà été planifiée.' }, { status: 409 })
  }

  // Fetch details for notifications and emails
  // bookings n'a pas de clé étrangère vers profiles : l'ancienne jointure
  // profiles!coach_id échouait (PGRST200) et AUCUNE notification/email ne partait.
  // Requêtes séparées.
  const [{ data: formation }, { data: people }] = await Promise.all([
    admin.from('formations').select('title').eq('id', booking.formation_id).maybeSingle(),
    admin.from('profiles').select('id, username').in('id', [booking.coach_id, booking.student_id].filter(Boolean)),
  ])
  const usernameOf = (id: string | null) => people?.find(p => p.id === id)?.username

  if (booking.coach_id) {
    const formationTitle  = formation?.title ?? 'votre coaching'
    const studentUsername = usernameOf(booking.student_id) ?? "L'élève"
    const coachUsername   = usernameOf(booking.coach_id) ?? 'Votre coach'

    // In-app notification to coach (insertion réservée au service-role — RLS)
    await createAdminSupabaseClient().from('notifications').insert({
      user_id: booking.coach_id,
      type:    'slot_proposed',
      title:   'Créneau proposé',
      body:    `${studentUsername} a proposé un créneau pour "${formationTitle}". Acceptez ou refusez dans votre espace.`,
      data:    { booking_id },
    })

    // Email to coach
    sendCoachSlotConfirmedEmail({
      coachId:         booking.coach_id,
      studentUsername,
      formationTitle,
      scheduledAt,
    }).catch(err => console.error('[confirm-slot] coach email error:', err.message))

    // Email to student confirming their request was sent
    sendStudentSlotConfirmedEmail({
      studentId:    booking.student_id,
      coachUsername,
      formationTitle,
      scheduledAt,
    }).catch(err => console.error('[confirm-slot] student email error:', err.message))
  }

  return NextResponse.json({ success: true })
}
