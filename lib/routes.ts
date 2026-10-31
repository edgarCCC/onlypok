import type { MetadataRoute } from 'next'

/* Carte unique des routes OnlyPok, lue par proxy.ts, app/robots.ts et
   app/sitemap.ts. Un préfixe protégé se compare par segment exact :
   '/train' couvre /train et /train/*, mais pas /trainer. */

export interface PublicRoute {
  path: string
  changeFrequency: NonNullable<MetadataRoute.Sitemap[number]['changeFrequency']>
  priority: number
}

/* Pages publiques indexables (sitemap). Les autres pages publiques
   (/login, /formations/[id], /coaches/[id]…) ne sont pas listées : le proxy
   laisse passer tout ce qui n'est pas protégé. */
export const PUBLIC_ROUTES: readonly PublicRoute[] = [
  { path: '/',                       changeFrequency: 'weekly',  priority: 1 },
  { path: '/formations',             changeFrequency: 'daily',   priority: 0.9 },
  { path: '/trainer',                changeFrequency: 'monthly', priority: 0.7 },
  { path: '/trainer/ranges',         changeFrequency: 'monthly', priority: 0.6 },
  { path: '/trainer/equity',         changeFrequency: 'monthly', priority: 0.6 },
  { path: '/trainer/quiz',           changeFrequency: 'monthly', priority: 0.6 },
  { path: '/tracker',                changeFrequency: 'monthly', priority: 0.6 },
  { path: '/register',               changeFrequency: 'yearly',  priority: 0.5 },
  { path: '/become-coach',           changeFrequency: 'yearly',  priority: 0.5 },
  { path: '/legal/mentions-legales', changeFrequency: 'yearly',  priority: 0.1 },
  { path: '/legal/cgu',              changeFrequency: 'yearly',  priority: 0.1 },
  { path: '/legal/confidentialite',  changeFrequency: 'yearly',  priority: 0.1 },
  { path: '/legal/cookies',          changeFrequency: 'yearly',  priority: 0.1 },
]

// Espace élève : connecté, quel que soit le rôle
export const STUDENT_ROUTES: readonly string[] = ['/dashboard', '/schedule', '/train', '/messages', '/coaching']
// Lecteur de formation, /formations/[id]/learn : connecté (la garde d'achat reste dans la page)
const LEARN_ROUTE = /^\/formations\/[^/]+\/learn(?:\/|$)/
// Espace coach : rôle coach ou admin
export const COACH_ROUTES: readonly string[] = ['/coach']
// Interface admin : rôle admin, sauf sa porte d'entrée, accessible déconnecté
export const ADMIN_ROUTES: readonly string[] = ['/admin']
export const ADMIN_LOGIN_ROUTE = '/admin/login'

// Préfixes réservés aux connectés (robots.txt)
export const PROTECTED_ROUTES: readonly string[] = [...COACH_ROUTES, ...ADMIN_ROUTES, ...STUDENT_ROUTES]

function matchesRoute(pathname: string, route: string): boolean {
  return pathname === route || pathname.startsWith(`${route}/`)
}

export function isStudentRoute(pathname: string): boolean {
  return STUDENT_ROUTES.some((route) => matchesRoute(pathname, route)) || LEARN_ROUTE.test(pathname)
}

export function isCoachRoute(pathname: string): boolean {
  return COACH_ROUTES.some((route) => matchesRoute(pathname, route))
}

export function isAdminRoute(pathname: string): boolean {
  return ADMIN_ROUTES.some((route) => matchesRoute(pathname, route))
}
