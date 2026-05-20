import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'

export async function GET() {
  const apiKey = process.env.DAILY_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'DAILY_API_KEY not set' }, { status: 500 })

  const supabase = createAdminSupabaseClient()

  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('id, scheduled_at, meeting_url')
    .like('meeting_url', '%meet.jit.si%')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!bookings?.length) return NextResponse.json({ ok: true, migrated: 0, message: 'Aucun lien Jitsi trouvé' })

  const results: { id: string; url: string; error?: string }[] = []

  for (const booking of bookings) {
    const name = `onlypok-${booking.id.replace(/-/g, '').slice(0, 16)}`
    const exp  = booking.scheduled_at
      ? Math.floor(new Date(booking.scheduled_at).getTime() / 1000) + 2 * 3600
      : Math.floor(Date.now() / 1000) + 24 * 3600

    try {
      const res = await fetch('https://api.daily.co/v1/rooms', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          properties: { exp, enable_chat: true, enable_screenshare: true },
        }),
      })

      const data = await res.json()
      const url: string = res.ok
        ? data.url
        : data.info?.includes('already exists')
          ? `https://meet.daily.co/${name}`
          : null

      if (!url) {
        results.push({ id: booking.id, url: '', error: JSON.stringify(data) })
        continue
      }

      await supabase.from('bookings').update({ meeting_url: url }).eq('id', booking.id)
      results.push({ id: booking.id, url })
    } catch (e: any) {
      results.push({ id: booking.id, url: '', error: e.message })
    }
  }

  const migrated = results.filter(r => !r.error).length
  return NextResponse.json({ ok: true, migrated, total: bookings.length, results })
}
