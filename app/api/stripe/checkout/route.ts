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

    /* already purchased */
    if (formation.content_type !== 'coaching') {
      const { data: existing } = await supabase
        .from('formation_purchases')
        .select('id')
        .eq('formation_id', formation_id)
        .eq('user_id', user.id)
        .single()
      if (existing) return NextResponse.json({ error: 'Already purchased' }, { status: 409 })
    }

    /* weekend multiplier — applied server-side so it can't be bypassed */
    const isCoachingType = formation.content_type === 'coaching'
    let weekendMultiplier = 1
    if (isCoachingType && formation.coach_id) {
      const { data: coachProfile } = await supabase
        .from('profiles')
        .select('weekend_rate_pct')
        .eq('id', formation.coach_id)
        .single()
      const pct = coachProfile?.weekend_rate_pct ?? 0
      if (pct > 0) {
        const now = new Date()
        const day = now.getDay() // 0 = dimanche, 6 = samedi
        if (day === 0 || day === 6) weekendMultiplier = 1 + pct / 100
      }
    }

    let unitAmount: number
    let productName: string
    if (isCoachingType && Array.isArray(formation.coaching_packs) && pack_index != null) {
      const pack = formation.coaching_packs[pack_index]
      if (!pack) return NextResponse.json({ error: 'Pack not found' }, { status: 404 })
      unitAmount = Math.round(pack.price * weekendMultiplier * 100)
      productName = `${formation.title} — ${pack.label ?? `Pack ${pack_index + 1}`}${weekendMultiplier > 1 ? ' (tarif week-end)' : ''}`
    } else {
      unitAmount = Math.round(formation.price * weekendMultiplier * 100)
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
