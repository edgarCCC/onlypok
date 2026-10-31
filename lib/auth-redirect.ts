/* Retour à la page d'origine après connexion (N2).

   `next` arrive par la query string : c'est une entrée utilisateur, donc une
   redirection ouverte potentielle. safeNext() n'accepte qu'un chemin interne
   et renvoie null pour tout le reste. proxy.ts, /login, /register,
   /auth/callback et la fiche formation passent tous par ici, et aucune URL
   absolue n'est jamais construite à partir de `next`.

   Acceptés : « / », « /formations », « /formations/abc?pack=1#tarifs »,
              « /a/../b » (renvoyé normalisé : « /b »).
   Refusés  : null, vide, « formations » (pas de « / » initial),
              « https://evil.com », « http://evil.com », « evil.com/ »,
              « //evil.com », « ///evil.com », « /\evil.com » (protocol-relative),
              « /..//evil.com » (normalisé en « //evil.com »),
              « javascript:alert(1) », « data:text/html,… »,
              « /\n//evil.com » et « /\t/evil.com » (le parseur d'URL ignore
              ces caractères, ce qui recréerait « //evil.com »), « \r\n »
              (injection d'en-tête Location), espaces, caractères de contrôle,
              antislash, plus de 2 048 caractères.
   Cas couverts par tests/e2e/auth-redirect.spec.ts. */

const MAX_NEXT_LENGTH = 2048
// Caractères de contrôle (dont \r et \n), espace et DEL
const CONTROL_OR_SPACE = /[\u0000- \u007f]/
// Origine fictive : un chemin interne résolu contre cette base y reste
const BASE_ORIGIN = 'http://localhost'

/* Un seul « / » initial (« //… » et « /\… » sont des URL protocol-relative),
   puis vérification par le parseur d'URL que l'origine ne change pas. */
function isInternalPath(candidate: string): boolean {
  if (candidate[0] !== '/' || candidate[1] === '/' || candidate[1] === '\\') return false
  try {
    return new URL(candidate, BASE_ORIGIN).origin === BASE_ORIGIN
  } catch {
    return false
  }
}

export function safeNext(value: string | null | undefined): string | null {
  if (typeof value !== 'string' || value.length === 0 || value.length > MAX_NEXT_LENGTH) return null
  if (CONTROL_OR_SPACE.test(value) || value.includes('\\')) return null
  if (!isInternalPath(value)) return null
  // Forme normalisée (« /a/../b » → « /b »), revérifiée : « /..//evil.com » devient « //evil.com »
  const { pathname, search, hash } = new URL(value, BASE_ORIGIN)
  const normalized = `${pathname}${search}${hash}`
  return isInternalPath(normalized) ? normalized : null
}

/* Pages d'authentification : un connecté qui les ouvre est renvoyé vers son
   espace, et `next` ne doit jamais y pointer (boucle de redirection). */
export const AUTH_ROUTES: readonly string[] = ['/login', '/register']

export function isAuthRoute(path: string): boolean {
  const pathname = path.split(/[?#]/, 1)[0]
  return AUTH_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))
}

/* Espace par défaut après connexion : admin → /admin, coach → /coach/dashboard,
   élève (ou profil absent) → /formations tant que le dashboard refondu n'existe pas. */
export function homeForRole(role: string | null | undefined): string {
  if (role === 'admin') return '/admin'
  if (role === 'coach') return '/coach/dashboard'
  return '/formations'
}

/* Lien interne porteur de `next` (encodé), ou le lien nu si `next` est absent.
   `path` ne doit pas déjà contenir de query string. */
export function withNext(path: string, next: string | null | undefined): string {
  return next ? `${path}?next=${encodeURIComponent(next)}` : path
}
