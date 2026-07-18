import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'

/* GET /auth/callback?code=…
   Retour OAuth (Google…) : échange le code contre une session, garantit
   l'existence du profil (créé en élève au premier login social), puis
   redirige selon le rôle. */
export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next')

  if (!code) return NextResponse.redirect(`${origin}/login?error=oauth`)

  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)
  if (error || !data.user) {
    console.error('[auth/callback] exchange failed:', error?.message)
    return NextResponse.redirect(`${origin}/login?error=oauth`)
  }

  const user  = data.user
  const admin = createAdminSupabaseClient()

  /* Premier login social : pas de ligne profiles (l'inscription classique la
     crée côté formulaire). On la crée en élève avec le nom Google. */
  const { data: profile } = await admin
    .from('profiles').select('id, role').eq('id', user.id).maybeSingle()

  let role: string | null = profile?.role ?? null
  if (!profile) {
    const meta = (user.user_metadata ?? {}) as { full_name?: string; name?: string }
    const base = (meta.full_name || meta.name || user.email?.split('@')[0] || 'joueur')
      .trim().replace(/\s+/g, '_').slice(0, 24)
    /* username unique : suffixe aléatoire en cas de collision */
    let username = base
    for (let i = 0; i < 3; i++) {
      const { error: insErr } = await admin.from('profiles').insert({
        id: user.id, email: user.email, username, role: 'student', xp: 0,
        avatar_url: (user.user_metadata as { avatar_url?: string })?.avatar_url ?? null,
      })
      if (!insErr) { role = 'student'; break }
      if (insErr.code === '23505' && insErr.message.includes('username')) {
        username = `${base}_${Math.floor(Math.random() * 9000 + 1000)}`
        continue
      }
      console.error('[auth/callback] profile insert failed:', insErr.message)
      break
    }
  }

  const dest = next && next.startsWith('/')
    ? next
    : role === 'coach' ? '/coach/dashboard' : '/formations'
  return NextResponse.redirect(`${origin}${dest}`)
}
