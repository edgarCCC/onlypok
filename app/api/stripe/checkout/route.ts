import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-04-22.dahlia' })
  try {
    const { formation_id, pack_index } = await req.json()

    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

    const { data: formation, error } = await supabase
      .from('formations')
      .select('id, title, price, thumbnail_url, content_type, coaching_packs')
      .eq('id', formation_id)
      .single()
    if (error || !formation) return NextResponse.json({ error: 'Formation not found' }, { status: 404 })

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

    /* price in cents */
    let unitAmount: number
    let productName: string
    if (formation.content_type === 'coaching' && Array.isArray(formation.coaching_packs) && pack_index != null) {
      const pack = formation.coaching_packs[pack_index]
      if (!pack) return NextResponse.json({ error: 'Pack not found' }, { status: 404 })
      unitAmount = Math.round(pack.price * 100)
      productName = `${formation.title} — ${pack.title ?? `Pack ${pack_index + 1}`}`
    } else {
      unitAmount = Math.round(formation.price * 100)
      productName = formation.title
    }

    const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            unit_amount: unitAmount,
            product_data: {
              name: productName,
              ...(formation.thumbnail_url ? { images: [formation.thumbnail_url] } : {}),
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        formation_id,
        user_id: user.id,
        pack_index: pack_index != null ? String(pack_index) : '',
      },
      success_url: `${origin}/formations/${formation_id}/learn?payment=success`,
      cancel_url:  `${origin}/formations/${formation_id}`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error('[stripe/checkout]', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
