/* ─── Origine publique de l'application ─────────────────────────────────────
   getAppUrl()          : URL publique (emails, liens) — ex-copie privée de lib/email.ts.
   resolveAppOrigin(req): origine des URL de retour Stripe (success_url / cancel_url).
     Le header Origin est envoyé par le navigateur, donc choisi par l'appelant :
     un compte authentifié pouvait faire atterrir la fin du paiement (ou son
     annulation) sur un domaine à lui. Il n'est accepté que s'il figure dans
     allowedOrigins() — NEXT_PUBLIC_APP_URL, https://VERCEL_URL, https://VERCEL_BRANCH_URL —
     ou s'il est local (localhost / 127.0.0.1) hors production ; sinon on
     retombe sur NEXT_PUBLIC_APP_URL. Pour une origine autorisée, la valeur
     renvoyée est l'origine elle-même : les URL de retour ne changent pas.

   Module pur, `env` injectable : tests/e2e/app-origin.spec.ts (sans serveur). */

type Env = Record<string, string | undefined>

/* Domaine définitif pas encore acheté : tout dérive de NEXT_PUBLIC_APP_URL,
   repli sur le domaine Vercel actuel. Aucune URL de domaine en dur ailleurs. */
export const FALLBACK_APP_URL = 'https://onlypok.vercel.app'
/** Repli en local (dev server) quand NEXT_PUBLIC_APP_URL n'est pas définie — comportement historique de checkout. */
export const LOCAL_APP_URL = 'http://localhost:3000'

/** URL publique de l'application, sans barre oblique finale. */
export function getAppUrl(env: Env = process.env): string {
  const raw = env.NEXT_PUBLIC_APP_URL?.trim() || FALLBACK_APP_URL
  return raw.replace(/\/+$/, '')
}

/** Vercel pose VERCEL_ENV (production | preview | development) ; la variable est absente en local. */
export function isProductionEnv(env: Env = process.env): boolean {
  return env.VERCEL_ENV === 'production'
}

/** Origine canonique (scheme://hôte[:port]) d'une URL http(s), sinon null (vide, « null », schéma exotique, illisible). */
function originOf(value: string | null | undefined): string | null {
  if (!value) return null
  try {
    const url = new URL(value.trim())
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.origin : null
  } catch {
    return null
  }
}

/** Origines connues de l'application : celles vers lesquelles un retour de paiement peut pointer. */
export function allowedOrigins(env: Env = process.env): string[] {
  const candidates = [
    env.NEXT_PUBLIC_APP_URL,
    env.VERCEL_URL ? `https://${env.VERCEL_URL}` : undefined,
    env.VERCEL_BRANCH_URL ? `https://${env.VERCEL_BRANCH_URL}` : undefined,
  ]
  return [...new Set(candidates.map(originOf).filter((origin): origin is string => origin !== null))]
}

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1'])

function isLocalOrigin(origin: string): boolean {
  return LOCAL_HOSTS.has(new URL(origin).hostname)
}

/** Origine à utiliser pour les URL de retour : le header Origin s'il est connu
    (ou local hors production), sinon l'URL publique de l'application. */
export function resolveAppOrigin(req: { headers: { get(name: string): string | null } }, env: Env = process.env): string {
  const requested = originOf(req.headers.get('origin'))
  if (requested && (allowedOrigins(env).includes(requested) || (!isProductionEnv(env) && isLocalOrigin(requested)))) {
    return requested
  }
  // Repli : NEXT_PUBLIC_APP_URL ; en local sans cette variable, le dev server (comme avant) ; sinon getAppUrl().
  if (!env.NEXT_PUBLIC_APP_URL?.trim() && env.VERCEL_ENV === undefined) return LOCAL_APP_URL
  return getAppUrl(env)
}
