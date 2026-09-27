/**
 * Détection du type de fichier par « magic bytes » (signature binaire réelle),
 * et non par l'en-tête `Content-Type`/l'extension fournis par le client — tous
 * deux falsifiables. Empêche l'upload d'un .html/.svg déguisé en image
 * (phishing / stored content-spoofing) et le path traversal via le nom.
 */

export interface SniffedType {
  mime: string
  ext: string
}

function ascii(buf: Buffer, start: number, end: number): string {
  return buf.toString('ascii', start, end)
}

/** Renvoie le type réel du buffer, ou null si non reconnu / non autorisé. */
export function sniffMime(buf: Buffer): SniffedType | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { mime: 'image/jpeg', ext: 'jpg' }
  }
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) {
    return { mime: 'image/png', ext: 'png' }
  }
  if (buf.length >= 12 && ascii(buf, 0, 4) === 'RIFF' && ascii(buf, 8, 12) === 'WEBP') {
    return { mime: 'image/webp', ext: 'webp' }
  }
  if (buf.length >= 6 && (ascii(buf, 0, 6) === 'GIF87a' || ascii(buf, 0, 6) === 'GIF89a')) {
    return { mime: 'image/gif', ext: 'gif' }
  }
  if (buf.length >= 5 && ascii(buf, 0, 5) === '%PDF-') {
    return { mime: 'application/pdf', ext: 'pdf' }
  }
  return null
}

export const IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
