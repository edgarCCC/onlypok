import Stripe from 'stripe'
import type { SupabaseClient } from '@supabase/supabase-js'
import { sendCoachNewBookingEmail, sendStudentBookingAcceptedEmail } from '@/lib/email'

/* Jitsi Meet — repli gratuit sans clé API, nom de room non devinable */
export function createMeetingUrl(bookingId: string): string {
  const room = `onlypok-${bookingId.replace(/-/g, '').slice(0, 20)}`
  return `https://meet.jit.si/${room}`
}

/* Room visio pro via Daily.co (onlypok.daily.co/…), avec repli Jitsi si
   l'API échoue. La room expire 2h après l'heure de session (24h si inconnue)
   — Daily la nettoie tout seul. */
export async function createMeetingRoom(bookingId: string, scheduledAt?: string | null): Promise<string> {
  const apiKey = process.env.DAILY_API_KEY
  if (!apiKey) return createMeetingUrl(bookingId)

  const name = `onlypok-${bookingId.replace(/-/g, '').slice(0, 16)}`
  const exp  = scheduledAt
    ? Math.floor(new Date(scheduledAt).getTime() / 1000) + 2 * 3600
    : Math.floor(Date.now() / 1000) + 24 * 3600

  try {
    const res  = await fetch('https://api.daily.co/v1/rooms', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, properties: { exp, enable_chat: true, enable_screenshare: true } }),
    })
    const data = await res.json()
    if (res.ok && data.url) return data.url as string
    if (typeof data.info === 'string' && data.info.includes('already exists')) {
      const domain = (data.domain_name as string | undefined) ?? 'onlypok.daily.co'
      return `https://${domain}/${name}`
    }
    console.error('[bookings] Daily room creation failed:', JSON.stringify(data).slice(0, 200))
  } catch (err) {
    console.error('[bookings] Daily API error:', (err as Error).message)
  }
  return createMeetingUrl(bookingId)
}

export type EnsureBookingsResult = {
  error: { message: string; code?: string } | null
  /* statut donné à la 1re session du pack (utile pour la bannière côté élève) */
  firstStatus?: 'scheduled' | 'pending_coach_approval' | 'paid_pending_schedule'
  alreadyComplete?: boolean
}

/* ─── Création des bookings coaching après paiement Stripe ────────────────────
   Source de vérité UNIQUE, appelée par le webhook ET par verify-session : les
   deux chemins restent synchrones par construction (idempotence incluse).

   Statut de la 1re session selon le contexte :
   - créneau choisi au checkout + coach en résa instantanée ('auto')
       → 'scheduled' direct : capture du paiement + lien visio + notifs
   - créneau choisi + coach sur dossier ('manual')
       → 'pending_coach_approval' : le créneau est déjà proposé, le coach
         accepte (capture) ou refuse — l'élève n'a PAS à re-proposer
   - pas de créneau (ou créneau pris entre-temps)
       → 'paid_pending_schedule' : l'élève choisit plus tard
   Les sessions 2..n d'un pack sont toujours 'paid_pending_schedule'. ────────── */
export async function ensureCoachingBookings(
  admin: SupabaseClient,
  stripe: Stripe,
  session: Stripe.Checkout.Session,
): Promise<EnsureBookingsResult> {
  const meta        = session.metadata ?? {}
  const formationId = meta.formation_id
  const userId      = meta.user_id
  const coachId     = meta.coach_id || null
  const rawPackIndex = meta.pack_index
  const packIndex   = rawPackIndex && rawPackIndex !== '' ? Number(rawPackIndex) : null
  const scheduledAt = meta.scheduled_at || null

  if (!formationId || !userId) return { error: { message: 'Missing metadata (formation_id/user_id)' } }
  if (!coachId) console.error('[bookings] coach_id absent des metadata — booking orphelin', { formationId })

  const paymentIntentId = typeof session.payment_intent === 'string'
    ? session.payment_intent
    : (session.payment_intent as { id?: string } | null)?.id ?? null

  /* Formation (packs + titre) et mode de réservation du coach */
  const [{ data: formation }, coachRes] = await Promise.all([
    admin.from('formations').select('title, coaching_packs').eq('id', formationId).single(),
    coachId
      ? admin.from('profiles').select('coaching_mode, username').eq('id', coachId).single()
      : Promise.resolve({ data: null }),
  ])
  const coachProfile = (coachRes as { data: { coaching_mode: string | null; username: string | null } | null }).data

  let sessionsCount = 1
  const pack = packIndex !== null && !isNaN(packIndex) && Array.isArray(formation?.coaching_packs)
    ? (formation!.coaching_packs as { hours?: number; label?: string; price?: number }[])[packIndex]
    : null
  if (packIndex !== null && !pack) console.error('[bookings] pack introuvable', { packIndex, formationId })
  if (pack?.hours && pack.hours > 1) sessionsCount = pack.hours

  /* Idempotence : compter les bookings déjà créés pour ce paiement */
  const [anchorRes, suffixRes] = await Promise.all([
    admin.from('bookings').select('id', { count: 'exact', head: true }).eq('stripe_session_id', session.id),
    admin.from('bookings').select('id', { count: 'exact', head: true }).like('stripe_session_id', `${session.id}_%`),
  ])
  if (anchorRes.error) console.error('[bookings] idempotency anchor error:', anchorRes.error.message)
  if (suffixRes.error) console.error('[bookings] idempotency suffix error:', suffixRes.error.message)
  const startIdx = (anchorRes.count ?? 0) + (suffixRes.count ?? 0)

  if (startIdx >= sessionsCount) return { error: null, alreadyComplete: true }

  /* Statut de la première session (uniquement si elle reste à créer) */
  let firstStatus: EnsureBookingsResult['firstStatus'] = 'paid_pending_schedule'
  let firstScheduledAt: string | null = null
  if (startIdx === 0 && scheduledAt && coachId) {
    /* Le créneau est-il encore libre ? (course possible pendant le checkout) */
    const { data: conflict } = await admin
      .from('bookings')
      .select('id')
      .eq('coach_id', coachId)
      .eq('scheduled_at', scheduledAt)
      .in('status', ['scheduled', 'pending_coach_approval'])
      .maybeSingle()

    if (!conflict) {
      firstScheduledAt = scheduledAt
      firstStatus = coachProfile?.coaching_mode === 'auto' ? 'scheduled' : 'pending_coach_approval'
    }
  }

  const pricePaid = session.amount_total != null ? session.amount_total / 100 : null

  let anchorId: string | null = null
  for (let i = startIdx; i < sessionsCount; i++) {
    const isFirst = i === 0
    const row = {
      formation_id:             formationId,
      student_id:               userId,
      coach_id:                 coachId,
      pack_index:               packIndex,
      status:                   isFirst ? firstStatus : 'paid_pending_schedule',
      scheduled_at:             isFirst ? firstScheduledAt : null,
      stripe_session_id:        i === 0 ? session.id : `${session.id}_${i}`,
      stripe_payment_intent_id: paymentIntentId,
      price_paid:               isFirst ? pricePaid : null,
    }
    const { data: inserted, error: bookingError } = await admin
      .from('bookings').insert(row).select('id').single()

    if (bookingError) {
      if (bookingError.code === '23505') continue
      return { error: { message: bookingError.message, code: bookingError.code }, firstStatus }
    }
    if (isFirst) anchorId = inserted?.id ?? null
  }

  /* Résa instantanée : capture du paiement + lien visio, comme le ferait
     l'acceptation du coach. Si la capture échoue, on repasse la session en
     attente d'approbation pour que le chemin coach (accept) capture plus tard. */
  let finalMeetingUrl: string | null = null
  if (firstStatus === 'scheduled' && anchorId) {
    let captured = true
    if (paymentIntentId) {
      try {
        await stripe.paymentIntents.capture(paymentIntentId)
      } catch (err) {
        const msg = (err as { message?: string; code?: string })
        if (msg.message?.includes('already been captured') || msg.code === 'charge_already_captured') {
          // déjà capturé — idempotent
        } else {
          captured = false
          console.error('[bookings] capture Stripe échouée en résa instantanée:', msg.message)
        }
      }
    }
    if (captured) {
      finalMeetingUrl = await createMeetingRoom(anchorId, firstScheduledAt)
      await admin.from('bookings').update({ meeting_url: finalMeetingUrl }).eq('id', anchorId)
    } else {
      await admin.from('bookings').update({ status: 'pending_coach_approval' }).eq('id', anchorId)
      firstStatus = 'pending_coach_approval'
    }
  }

  /* Notifications + emails — seulement au premier passage (idempotence) */
  if (startIdx === 0) {
    const { data: student } = await admin.from('profiles').select('username').eq('id', userId).single()
    const studentName  = student?.username ?? 'Un élève'
    const formTitle    = formation?.title ?? 'votre coaching'

    if (coachId) {
      const coachBody =
        firstStatus === 'scheduled'
          ? `${studentName} a réservé "${formTitle}" — créneau confirmé automatiquement, retrouvez le lien visio dans votre espace.`
          : firstStatus === 'pending_coach_approval'
            ? `${studentName} a réservé "${formTitle}" et propose un créneau. Acceptez ou refusez dans 48h.`
            : `${studentName} a réservé "${formTitle}". Acceptez ou refusez dans 48h.`
      await admin.from('notifications').insert({
        user_id: coachId,
        type:    firstStatus === 'scheduled' ? 'booking_accepted' : 'new_request',
        title:   firstStatus === 'scheduled' ? 'Session confirmée' : 'Nouvelle réservation de coaching',
        body:    coachBody,
        data:    { booking_formation_id: formationId, student_id: userId },
      })
      sendCoachNewBookingEmail({
        coachId,
        studentUsername: studentName,
        formationTitle:  formTitle,
        packLabel:       pack?.label ?? null,
        price:           pack?.price ?? null,
      }).catch(err => console.error('[bookings] email coach error:', (err as Error).message))
    }

    if (firstStatus === 'scheduled' && anchorId) {
      await admin.from('notifications').insert({
        user_id: userId,
        type:    'booking_accepted',
        title:   'Coaching confirmé !',
        body:    `Votre session "${formTitle}" est confirmée. Retrouvez le lien de visio dans votre planning.`,
        data:    { booking_id: anchorId, meeting_url: finalMeetingUrl },
      })
      sendStudentBookingAcceptedEmail({
        studentId:      userId,
        coachUsername:  coachProfile?.username ?? 'Votre coach',
        formationTitle: formTitle,
        bookingId:      anchorId,
      }).catch(err => console.error('[bookings] email élève error:', (err as Error).message))
    }
  }

  return { error: null, firstStatus }
}
