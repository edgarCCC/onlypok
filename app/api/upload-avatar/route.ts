import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const userClient = await createServerSupabaseClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const form = await req.formData()
  const file = form.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)
  const path = `${user.id}/avatar.jpg`

  const admin = createAdminSupabaseClient()
  const { error: uploadError } = await admin.storage
    .from('avatars')
    .upload(path, buffer, { contentType: 'image/jpeg', upsert: true })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: urlData } = admin.storage.from('avatars').getPublicUrl(path)
  const url = `${urlData.publicUrl}?t=${Date.now()}`

  const { error: dbError } = await admin
    .from('profiles')
    .update({ avatar_url: url })
    .eq('id', user.id)

  if (dbError) {
    console.error('[upload-avatar] profiles update failed:', dbError.message)
    // Column may not exist yet — still return the URL so the UI shows the image
  }

  return NextResponse.json({ url, dbError: dbError?.message ?? null })
}
