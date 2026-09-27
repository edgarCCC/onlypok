import dns from 'node:dns/promises'
import net from 'node:net'

/**
 * Garde anti-SSRF (Server-Side Request Forgery).
 *
 * Avant tout `fetch` serveur vers une URL fournie par un utilisateur, on :
 *  - impose le protocole (https par défaut),
 *  - (optionnel) restreint à une allowlist d'hôtes,
 *  - résout le DNS et rejette toute IP privée / loopback / link-local / réservée
 *    (bloque l'accès aux métadonnées cloud 169.254.169.254, aux services internes,
 *    au port-scanning du réseau de l'hébergeur).
 */

function ipv4ToInt(ip: string): number {
  return ip.split('.').reduce((acc, part) => (acc << 8) + parseInt(part, 10), 0) >>> 0
}

function isPrivateIpv4(ip: string): boolean {
  const n = ipv4ToInt(ip)
  const inRange = (start: string, bits: number) =>
    (n >>> (32 - bits)) === (ipv4ToInt(start) >>> (32 - bits))
  return (
    inRange('10.0.0.0', 8) ||       // privé
    inRange('172.16.0.0', 12) ||    // privé
    inRange('192.168.0.0', 16) ||   // privé
    inRange('127.0.0.0', 8) ||      // loopback
    inRange('169.254.0.0', 16) ||   // link-local (métadonnées cloud)
    inRange('0.0.0.0', 8) ||        // "this host"
    inRange('100.64.0.0', 10) ||    // CGNAT
    inRange('192.0.0.0', 24) ||     // IETF
    inRange('192.0.2.0', 24) ||     // TEST-NET
    inRange('198.18.0.0', 15) ||    // benchmarking
    inRange('240.0.0.0', 4) ||      // réservé
    n === ipv4ToInt('255.255.255.255')
  )
}

function isPrivateIpv6(ip: string): boolean {
  const lower = ip.toLowerCase()
  if (lower === '::1' || lower === '::') return true
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true // unique local
  if (lower.startsWith('fe80')) return true                          // link-local
  // IPv4-mapped (::ffff:a.b.c.d)
  const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
  if (mapped) return isPrivateIpv4(mapped[1])
  return false
}

function isPrivateAddress(ip: string): boolean {
  const family = net.isIP(ip)
  if (family === 4) return isPrivateIpv4(ip)
  if (family === 6) return isPrivateIpv6(ip)
  return true // format inconnu → on refuse par prudence
}

interface AssertOptions {
  allowHosts?: string[]      // ex. ['xxxx.supabase.co'] — hostname exact ou suffixe .domaine
  protocols?: string[]       // défaut : ['https:']
}

/** Valide une URL et garantit qu'elle ne pointe pas vers une IP interne. Throw sinon. */
export async function assertPublicUrl(rawUrl: string, opts: AssertOptions = {}): Promise<URL> {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    throw new Error('URL invalide')
  }

  const protocols = opts.protocols ?? ['https:']
  if (!protocols.includes(url.protocol)) {
    throw new Error('Protocole non autorisé')
  }

  if (opts.allowHosts && opts.allowHosts.length > 0) {
    const host = url.hostname.toLowerCase()
    const ok = opts.allowHosts.some(
      (h) => host === h.toLowerCase() || host.endsWith('.' + h.toLowerCase()),
    )
    if (!ok) throw new Error('Hôte non autorisé')
  }

  // Si l'hôte est déjà une IP littérale, on la teste directement.
  if (net.isIP(url.hostname)) {
    if (isPrivateAddress(url.hostname)) throw new Error('Adresse IP interne interdite')
    return url
  }

  const resolved = await dns.lookup(url.hostname, { all: true })
  if (resolved.length === 0) throw new Error('Hôte introuvable')
  for (const { address } of resolved) {
    if (isPrivateAddress(address)) throw new Error('Adresse IP interne interdite')
  }

  return url
}

interface FetchOptions extends AssertOptions {
  maxBytes?: number          // défaut : 15 Mo
  timeoutMs?: number         // défaut : 8000
  headers?: Record<string, string>
}

/**
 * Fetch serveur "sûr" : valide l'URL (anti-SSRF), impose un timeout et une
 * taille maximale de réponse. Renvoie le corps en Buffer.
 */
export async function fetchPublicBuffer(rawUrl: string, opts: FetchOptions = {}): Promise<Buffer> {
  const maxBytes = opts.maxBytes ?? 15 * 1024 * 1024
  const timeoutMs = opts.timeoutMs ?? 8000

  await assertPublicUrl(rawUrl, opts)

  const res = await fetch(rawUrl, {
    headers: opts.headers,
    redirect: 'error', // pas de redirection (évite un rebond vers une IP interne)
    signal: AbortSignal.timeout(timeoutMs),
  })
  if (!res.ok) throw new Error(`Réponse ${res.status}`)

  const declared = Number(res.headers.get('content-length') ?? '0')
  if (declared > maxBytes) throw new Error('Fichier trop volumineux')

  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.byteLength > maxBytes) throw new Error('Fichier trop volumineux')
  return buf
}

/** Fetch texte "sûr" (ex. flux ICS de calendrier). */
export async function fetchPublicText(rawUrl: string, opts: FetchOptions = {}): Promise<string> {
  const buf = await fetchPublicBuffer(rawUrl, { maxBytes: 5 * 1024 * 1024, ...opts })
  return buf.toString('utf8')
}
