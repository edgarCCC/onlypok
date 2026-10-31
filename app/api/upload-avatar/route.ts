import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { readFormFile } from '@/lib/validate'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 Mo
const AVATAR_SIZE   = 512             // px, carré

export async function POST(req: NextRequest) {
  const userClient = await createServerSupabaseClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Q11 — multipart obligatoire (415), formulaire lisible, champ `file` présent et non vide (400), 5 Mo max (413)
  const upload = await readFormFile(req, { tag: 'upload-avatar', maxBytes: MAX_FILE_SIZE, tooLargeMessage: 'Image trop lourde (max 5 Mo)' })
  if (!upload.ok) return upload.response

  const bytes = await upload.file.arrayBuffer()

  /* Ré-encodage sharp : valide que c'est une vraie image (rejette PDF/scripts
     renommés) et garantit un vrai JPEG au contentType déclaré. */
  let buffer: Buffer
  try {
    buffer = await sharp(Buffer.from(bytes))
      .rotate() // applique l'orientation EXIF
      .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: 'cover' })
      .jpeg({ quality: 85 })
      .toBuffer()
  } catch {
    return NextResponse.json({ error: 'Fichier invalide — envoie une image (JPEG, PNG, WebP…)' }, { status: 400 })
  }

  const path = `${user.id}/avatar.jpg`

  const admin = createAdminSupabaseClient()
  const { error: uploadError } = await admin.storage
    .from('avatars')
    .upload(path, buffer, { contentType: 'image/jpeg', upsert: true })

  if (uploadError) {
    // Détail dans les logs seulement, jamais renvoyé au client.
    console.error('[upload-avatar] storage upload failed:', uploadError.message)
    return NextResponse.json({ error: 'Envoi de l’image impossible, réessaie.' }, { status: 500 })
  }

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

  // Aucun appelant ne lit ce drapeau ; le message brut de la base reste dans les logs.
  return NextResponse.json({ url, profileUpdated: !dbError })
}
