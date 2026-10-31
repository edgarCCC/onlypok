import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'
import { validateSlot, supabaseSlotStore, SLOT_REJECTION_HTTP } from '@/lib/slots'
import { int, object, optional, readJsonBody, string, uuid } from '@/lib/validate'
import { resolveAppOrigin } from '@/lib/app-origin'

/* Q11 — schéma du corps : UUID de formation, index de pack entier borné (l'index
   réel est ensuite contrôlé contre formation.coaching_packs → 400), créneau typé
   et borné seulement — le format ISO strict, le délai, la grille et les
   disponibilités restent à validateSlot (R3), sans doublon. */
const MAX_PACK_INDEX = 99 // l'UI coach ne plafonne pas le nombre de packs : garde-fou large
const CheckoutBody = object({
  formation_id: uuid(),
  pack_index:   optional(int({ min: 0, max: MAX_PACK_INDEX })),
  scheduled_at: optional(string({ max: 64 })),
})

export async function POST(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-04-22.dahlia' })
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

    const body = await readJsonBody(req, CheckoutBody, { tag: 'stripe/checkout' })
    if (!body.ok) return body.response
    const { formation_id, pack_index, scheduled_at } = body.data

    const { data: formation, error } = await supabase
      .from('formations')
      .select('id, title, price, thumbnail_url, content_type, coaching_packs, coach_id, coach:profiles!coach_id(avatar_url)')
      .eq('id', formation_id)
      .single()
    if (error || !formation) return NextResponse.json({ error: 'Formation not found' }, { status: 404 })

    const coachAvatar = (() => {
      const c = (formation as any).coach
      return Array.isArray(c) ? c[0]?.avatar_url : c?.avatar_url
    })()

    /* already purchased — bloquant pour une formation / vidéo (achat unique),
       jamais pour le coaching (on peut racheter un pack). formation_purchases
       est un registre (1 ligne par paiement) : .limit(1) et non .single(), qui
       échouerait dès 2 lignes et laisserait passer un double achat. */
    if (formation.content_type !== 'coaching') {
      const { data: existing, error: existingError } = await supabase
        .from('formation_purchases')
        .select('id')
        .eq('formation_id', formation_id)
        .eq('user_id', user.id)
        .limit(1)
      if (existingError) {
        console.error('[stripe/checkout] purchase check failed:', existingError.message)
        return NextResponse.json({ error: 'Vérification de l’achat impossible, réessayez.' }, { status: 500 })
      }
      if (existing && existing.length > 0) return NextResponse.json({ error: 'Already purchased' }, { status: 409 })
    }

    const isCoachingType = formation.content_type === 'coaching'

    let unitAmount: number
    let productName: string
    if (isCoachingType && Array.isArray(formation.coaching_packs) && pack_index != null) {
      const pack = formation.coaching_packs[pack_index]
      if (!pack) {
        console.warn('[stripe/checkout] pack inconnu', { formation_id, pack_index, userId: user.id })
        return NextResponse.json({ error: 'Pack inconnu pour cette formation.', code: 'unknown_pack' }, { status: 400 })
      }
      unitAmount = Math.round(pack.price * 100)
      productName = `${formation.title} — ${pack.label ?? `Pack ${pack_index + 1}`}`
    } else {
      unitAmount = Math.round(formation.price * 100)
      productName = formation.title
    }

    // URL de retour Stripe : le header Origin (choisi par l'appelant) n'est repris que s'il est
    // une origine connue de l'application, sinon NEXT_PUBLIC_APP_URL (lib/app-origin.ts).
    const origin = resolveAppOrigin(req)

    const coachId    = (formation as any).coach_id ?? ''
    const isCoaching = formation.content_type === 'coaching'

    if (isCoaching && !coachId) {
      console.error('[stripe/checkout] formation has no coach_id — booking will be orphaned', { formation_id })
    }

    /* R3 — le créneau choisi est validé AVANT la création de la session Stripe
       (ISO strict, délai minimal, grille, disponibilités du coach, déjà pris).
       Optionnel : packs ou résa sans créneau n'en envoient pas. Après paiement,
       lib/bookings.ts reprend la valeur canonique depuis les metadata. */
    let scheduledAtIso = ''
    if (isCoaching && scheduled_at != null && scheduled_at !== '') {
      let slot: Awaited<ReturnType<typeof validateSlot>>
      try {
        slot = await validateSlot({ coachId, scheduledAt: scheduled_at }, supabaseSlotStore(createAdminSupabaseClient()))
      } catch (err) {
        console.error('[stripe/checkout] vérification du créneau impossible:', (err as Error).message)
        return NextResponse.json({ error: 'Vérification du créneau impossible, réessaie.' }, { status: 500 })
      }
      if (!slot.ok) {
        console.warn('[stripe/checkout] créneau refusé', { formation_id, coachId, scheduled_at: String(scheduled_at).slice(0, 64), reason: slot.reason, userId: user.id })
        const { status, message } = SLOT_REJECTION_HTTP[slot.reason]
        return NextResponse.json({ error: message, code: slot.reason }, { status })
      }
      scheduledAtIso = slot.scheduledAt
    }
    // {CHECKOUT_SESSION_ID} is a Stripe template variable — replaced with the real session ID at redirect time
    const successUrl = isCoaching
      ? `${origin}/schedule?payment=success&session_id={CHECKOUT_SESSION_ID}`
      : `${origin}/formations/${formation_id}?payment=success&session_id={CHECKOUT_SESSION_ID}`

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      /* For coaching: manual capture — funds held until coach accepts */
      ...(isCoaching ? { payment_intent_data: { capture_method: 'manual' } } : {}),
      line_items: [
        {
          price_data: {
            currency: 'eur',
            unit_amount: unitAmount,
            product_data: {
              name: productName,
              ...(() => {
                const img = isCoaching ? (coachAvatar ?? formation.thumbnail_url) : formation.thumbnail_url
                return img ? { images: [img] } : {}
              })(),
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        formation_id,
        user_id:      user.id,
        coach_id:     coachId,
        content_type: formation.content_type,
        pack_index:   pack_index != null ? String(pack_index) : '',
        scheduled_at: scheduledAtIso,
      },
      success_url: successUrl,
      cancel_url:  `${origin}/formations/${formation_id}`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    // Détail (Stripe, Supabase, JSON) dans les logs seulement, jamais renvoyé au client.
    console.error('[stripe/checkout]', (err as Error).message)
    return NextResponse.json({ error: 'Impossible de lancer le paiement, réessaie.' }, { status: 500 })
  }
}
