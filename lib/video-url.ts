/* ── Parsing commun des URL vidéo (YouTube, Vimeo, fichier direct) ─────────────
   Utilisé par le lecteur élève et par les formulaires coach (validation + aperçu).

   YouTube : watch?v=, youtu.be/, embed/, shorts/, live/, v/, youtube-nocookie.com
   Vimeo   : vimeo.com/123, vimeo.com/123/<hash> (lien non répertorié / privé),
             vimeo.com/123?h=<hash>, player.vimeo.com/video/123?h=<hash>,
             channels/…/123, groups/…/videos/123, showcase/…/video/123
   Le hash Vimeo est CONSERVÉ jusqu'à l'URL d'embed (?h=…) : sans lui, une vidéo
   « privée (lien) » refuse de se lire. */

export type VideoProvider = 'youtube' | 'vimeo' | 'file'

export interface ParsedVideoUrl {
  provider: VideoProvider
  /** ID YouTube (11 car.) ou ID numérique Vimeo ; URL brute pour un fichier. */
  id: string
  /** Hash de confidentialité Vimeo (liens non répertoriés), sinon null. */
  hash: string | null
  embedUrl: string
  /** Miniature directe quand elle est connue sans appel API (YouTube). */
  thumbnailUrl: string | null
}

const YT_ID = /^[A-Za-z0-9_-]{11}$/
const VIMEO_ID = /^\d+$/
const VIMEO_HASH = /^[0-9a-f]{6,}$/i
const VIDEO_FILE = /\.(mp4|webm|mov|m4v|ogv|m3u8)$/i

function toUrl(raw: string): URL | null {
  const s = raw.trim()
  if (!s) return null
  try {
    return new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`)
  } catch {
    return null
  }
}

function hostIs(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`)
}

function parseYoutube(u: URL): ParsedVideoUrl | null {
  const host = u.hostname.toLowerCase()
  const parts = u.pathname.split('/').filter(Boolean)
  let id: string | null = null

  if (hostIs(host, 'youtu.be')) {
    id = parts[0] ?? null
  } else if (hostIs(host, 'youtube.com') || hostIs(host, 'youtube-nocookie.com')) {
    if (parts[0] === 'watch') id = u.searchParams.get('v')
    else if (['embed', 'shorts', 'live', 'v'].includes(parts[0] ?? '')) id = parts[1] ?? null
  } else {
    return null
  }

  if (!id || !YT_ID.test(id)) return null
  return {
    provider: 'youtube',
    id,
    hash: null,
    embedUrl: `https://www.youtube.com/embed/${id}`,
    thumbnailUrl: `https://img.youtube.com/vi/${id}/mqdefault.jpg`,
  }
}

function parseVimeo(u: URL): ParsedVideoUrl | null {
  const host = u.hostname.toLowerCase()
  if (!hostIs(host, 'vimeo.com')) return null
  const parts = u.pathname.split('/').filter(Boolean)

  /* « …/video/123 » ou « …/videos/123 » (player, showcase, groups, manage) ;
     sinon le premier segment numérique (vimeo.com/123, channels/x/123).
     Un hash hexadécimal peut suivre l'ID : vimeo.com/123/abcdef1234. */
  const after = parts.findIndex((p, i) => (p === 'video' || p === 'videos') && VIMEO_ID.test(parts[i + 1] ?? ''))
  const idx = after !== -1 ? after + 1 : parts.findIndex(p => VIMEO_ID.test(p))
  if (idx === -1) return null
  const id = parts[idx]
  const next = parts[idx + 1]
  const hashFromPath = next && VIMEO_HASH.test(next) ? next : null
  const hashFromQuery = u.searchParams.get('h')
  const hash = hashFromQuery && VIMEO_HASH.test(hashFromQuery) ? hashFromQuery : hashFromPath

  return {
    provider: 'vimeo',
    id,
    hash,
    embedUrl: `https://player.vimeo.com/video/${id}${hash ? `?h=${hash}` : ''}`,
    thumbnailUrl: null,
  }
}

function parseFile(u: URL): ParsedVideoUrl | null {
  if (!VIDEO_FILE.test(u.pathname)) return null
  /* u.href : un lien saisi sans schéma (« cdn.x/a.mp4 ») ressort préfixé de https:// */
  return { provider: 'file', id: u.href, hash: null, embedUrl: u.href, thumbnailUrl: null }
}

/** Analyse une URL vidéo saisie par un coach. Renvoie null si non reconnue. */
export function parseVideoUrl(raw: string | null | undefined): ParsedVideoUrl | null {
  if (!raw) return null
  const u = toUrl(raw)
  if (!u) return null
  return parseYoutube(u) ?? parseVimeo(u) ?? parseFile(u)
}

/** Ajoute des paramètres à une URL d'embed en respectant un éventuel « ?h= » Vimeo. */
export function withEmbedParams(embedUrl: string, params: Record<string, string>): string {
  const qs = new URLSearchParams(params).toString()
  if (!qs) return embedUrl
  return `${embedUrl}${embedUrl.includes('?') ? '&' : '?'}${qs}`
}
