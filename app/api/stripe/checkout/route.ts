import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-04-22.dahlia' })
  try {
    const { formation_id, pack_index, scheduled_at } = await req.json()

    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

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
      if (!pack) return NextResponse.json({ error: 'Pack not found' }, { status: 404 })
      unitAmount = Math.round(pack.price * 100)
      productName = `${formation.title} — ${pack.label ?? `Pack ${pack_index + 1}`}`
    } else {
      unitAmount = Math.round(formation.price * 100)
      productName = formation.title
    }

    const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    const coachId    = (formation as any).coach_id ?? ''
    const isCoaching = formation.content_type === 'coaching'

    if (isCoaching && !coachId) {
      console.error('[stripe/checkout] formation has no coach_id — booking will be orphaned', { formation_id })
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
        scheduled_at: scheduled_at ?? '',
      },
      success_url: successUrl,
      cancel_url:  `${origin}/formations/${formation_id}`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error('[stripe/checkout]', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
