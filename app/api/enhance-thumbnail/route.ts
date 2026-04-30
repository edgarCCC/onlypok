import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 30

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const { image_url, formation_id, user_id } = await req.json()

  if (!image_url || !formation_id || !user_id) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  }

  /* 1 ── Télécharge l'image originale */
  const imgRes = await fetch(image_url)
  if (!imgRes.ok) return NextResponse.json({ error: 'Cannot fetch image' }, { status: 502 })
  const original = Buffer.from(await imgRes.arrayBuffer())

  /* 2 ── Amélioration avec sharp (gratuit, traitement local)
     - Upscale 2× avec Lanczos (meilleure qualité)
     - Sharpening (unsharp mask) pour récupérer la netteté
     - Normalisation auto des niveaux (éclat + contraste)
     - Légère saturation pour des couleurs plus vives
  */
  const enhanced = await sharp(original)
    .resize({ width: 1920, height: 1080, fit: 'inside', withoutEnlargement: false, kernel: 'lanczos3' })
    .sharpen({ sigma: 1.2, m1: 1.5, m2: 0.7 })
    .normalise()
    .modulate({ saturation: 1.15 })
    .toFormat('jpeg', { quality: 95, mozjpeg: true })
    .toBuffer()

  /* 3 ── Upload vers Supabase Storage */
  const path = `${user_id}/${Date.now()}_enhanced.jpg`
  const { error: uploadErr } = await supabaseAdmin.storage
    .from('formations-thumbnails')
    .upload(path, enhanced, { contentType: 'image/jpeg', upsert: true })

  if (uploadErr) {
    return NextResponse.json({ error: uploadErr.message }, { status: 500 })
  }

  const { data: urlData } = supabaseAdmin.storage
    .from('formations-thumbnails')
    .getPublicUrl(path)

  /* 4 ── Met à jour thumbnail_url en base */
  await supabaseAdmin
    .from('formations')
    .update({ thumbnail_url: urlData.publicUrl })
    .eq('id', formation_id)

  return NextResponse.json({ enhanced_url: urlData.publicUrl })
}
