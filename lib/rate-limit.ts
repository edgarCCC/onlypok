/**
 * Rate-limiter mémoire (token bucket par clé) — anti-abus léger.
 *
 * Suffisant pour freiner le brute-force et le brûlage de crédits API sur une
 * instance. Note : la mémoire n'est pas partagée entre instances serverless ;
 * pour une limite stricte globale, passer à Upstash/Vercel KV. C'est déjà une
 * barrière efficace contre les scripts d'abus basiques.
 */

interface Bucket {
  count: number
  reset: number
}

const buckets = new Map<string, Bucket>()

export interface RateLimitResult {
  ok: boolean
  retryAfter: number // secondes avant la prochaine tentative autorisée
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()

  // Purge opportuniste des buckets expirés (borne la taille de la Map)
  if (buckets.size > 5000) {
    for (const [k, b] of buckets) {
      if (now > b.reset) buckets.delete(k)
    }
  }

  const bucket = buckets.get(key)
  if (!bucket || now > bucket.reset) {
    buckets.set(key, { count: 1, reset: now + windowMs })
    return { ok: true, retryAfter: 0 }
  }

  if (bucket.count >= limit) {
    return { ok: false, retryAfter: Math.max(1, Math.ceil((bucket.reset - now) / 1000)) }
  }

  bucket.count += 1
  return { ok: true, retryAfter: 0 }
}

/** Réponse 429 standard (à renvoyer telle quelle depuis une route). */
export function tooManyRequests(retryAfter: number): Response {
  return new Response(
    JSON.stringify({ error: 'Trop de requêtes, réessaie dans un instant.' }),
    { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': String(retryAfter) } },
  )
}
