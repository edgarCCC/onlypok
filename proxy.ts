import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { ADMIN_LOGIN_ROUTE, isAdminRoute, isCoachRoute, isStudentRoute } from '@/lib/routes'
import { homeForRole, isAuthRoute, safeNext } from '@/lib/auth-redirect'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  // Ne pas exécuter la logique de redirection sur les routes API
  if (pathname.startsWith('/api/')) return supabaseResponse

  // Porte d'entrée de l'interface admin : accessible déconnecté
  const isAdminLogin = pathname === ADMIN_LOGIN_ROUTE

  if (!user) {
    if (isAdminLogin) return supabaseResponse
    if (isAdminRoute(pathname)) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
    const isProtected = isCoachRoute(pathname) || isStudentRoute(pathname)
    if (isProtected) {
      // Retour après connexion (N2) : /login reçoit le chemin et la query d'origine
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('next', `${pathname}${request.nextUrl.search}`)
      return NextResponse.redirect(loginUrl)
    }
    return supabaseResponse
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role

  if (isCoachRoute(pathname) && role !== 'coach' && role !== 'admin') {
    return NextResponse.redirect(new URL('/formations', request.url))
  }

  // Connecté sur la page de login admin : un admin file au dashboard,
  // un autre rôle voit la page (elle refuse et déconnecte côté client)
  if (isAdminLogin) {
    return role === 'admin'
      ? NextResponse.redirect(new URL('/admin', request.url))
      : supabaseResponse
  }

  if (isAdminRoute(pathname) && role !== 'admin') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Connecté sur /login ou /register : retour à la page demandée (`next` sûr et
  // hors pages d'auth, sinon boucle), à défaut vers son espace selon le rôle
  if (isAuthRoute(pathname)) {
    const target = safeNext(request.nextUrl.searchParams.get('next'))
    const dest = target && !isAuthRoute(target) ? target : homeForRole(role)
    return NextResponse.redirect(new URL(dest, request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
