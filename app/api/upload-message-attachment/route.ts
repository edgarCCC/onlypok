import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabase/server'
import { sniffMime } from '@/lib/file-type'

const MAX_SIZE = 10 * 1024 * 1024 // 10 MB

export async function POST(req: NextRequest) {
  const userClient = await createServerSupabaseClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const form = await req.formData()
  const file = form.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })
  if (file.size > MAX_SIZE) return NextResponse.json({ error: 'Fichier trop lourd (max 10 Mo)' }, { status: 400 })

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  // Type réel via magic bytes (on ignore file.type/file.name, falsifiables).
  // Seuls images + PDF autorisés → pas de HTML/SVG déguisé (phishing).
  const detected = sniffMime(buffer)
  if (!detected) {
    return NextResponse.json({ error: 'Type de fichier non autorisé (images ou PDF uniquement)' }, { status: 400 })
  }

  // Chemin dérivé de l'id user + timestamp + extension SÛRE (jamais du nom client).
  const path = `${user.id}/${Date.now()}.${detected.ext}`

  const admin = createAdminSupabaseClient()
  const { error: uploadError } = await admin.storage
    .from('message-attachments')
    .upload(path, buffer, { contentType: detected.mime, upsert: false })

  if (uploadError) {
    console.error('[upload-message-attachment]', uploadError.message)
    return NextResponse.json({ error: 'Échec de l\'envoi' }, { status: 500 })
  }

  // Nom d'affichage : on repart du nom client mais assaini (jamais réutilisé comme chemin).
  const safeName = (file.name || 'fichier').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120)

  const { data: urlData } = admin.storage.from('message-attachments').getPublicUrl(path)
  return NextResponse.json({ url: urlData.publicUrl, name: safeName, mime: detected.mime, size: file.size })
}
