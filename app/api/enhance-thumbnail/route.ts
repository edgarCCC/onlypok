import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { fetchPublicBuffer } from '@/lib/net-guard'
import { rateLimit, tooManyRequests } from '@/lib/rate-limit'

export const maxDuration = 30

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// L'image source doit provenir du Storage Supabase du projet (pas d'URL arbitraire → anti-SSRF).
const SUPABASE_HOST = (() => {
  try { return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname } catch { return '' }
})()

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Anti-abus : opération lourde (fetch + sharp). Max 10 / minute / utilisateur.
  const limit = rateLimit(`enhance:${user.id}`, 10, 60_000)
  if (!limit.ok) return tooManyRequests(limit.retryAfter)

  const { image_url, formation_id, user_id } = await req.json()

  if (!image_url || !formation_id || !user_id) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  }

  if (user.id !== user_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: formation } = await supabase
    .from('formations')
    .select('id')
    .eq('id', formation_id)
    .eq('coach_id', user.id)
    .single()
  if (!formation) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  /* 1 ── Télécharge l'image originale (URL restreinte au Storage Supabase, taille bornée) */
  let original: Buffer
  try {
    original = await fetchPublicBuffer(image_url, {
      allowHosts: SUPABASE_HOST ? [SUPABASE_HOST] : undefined,
      maxBytes: 15 * 1024 * 1024,
      timeoutMs: 10_000,
    })
  } catch {
    return NextResponse.json({ error: 'Image source invalide' }, { status: 400 })
  }

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
    console.error('[enhance-thumbnail] upload', uploadErr.message)
    return NextResponse.json({ error: 'Échec de l\'envoi de l\'image' }, { status: 500 })
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
