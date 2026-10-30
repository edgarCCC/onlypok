'use client'

import Image from 'next/image'
import { parseVideoUrl } from '@/lib/video-url'

/* ── Contrôle de saisie côté coach : validation, mini-aperçu, consigne ──────────
   Non bloquant : un fichier vidéo direct (.mp4…) reste accepté. */
const OK_COLOR   = '#22c55e'
const ERR_COLOR  = '#f87171'
const HINT_COLOR = 'rgba(240,244,255,0.45)'
const PAID_COLOR = '#fbbf24'

export default function VideoUrlCheck({ url, isPaid }: { url: string; isPaid: boolean }) {
  const value = url.trim()
  const parsed = value ? parseVideoUrl(value) : null

  const status = !value ? null
    : !parsed ? { color: ERR_COLOR, text: 'Lien non reconnu : colle un lien YouTube (watch, youtu.be, shorts) ou Vimeo (vimeo.com/…).' }
    : parsed.provider === 'youtube' ? { color: OK_COLOR, text: 'Lien YouTube reconnu.' }
    : parsed.provider === 'vimeo' ? { color: OK_COLOR, text: parsed.hash ? 'Lien Vimeo privé reconnu (clé de partage conservée).' : 'Lien Vimeo reconnu.' }
    : { color: OK_COLOR, text: 'Fichier vidéo direct reconnu.' }

  const hint = isPaid
    ? 'Contenu payant : vidéo YouTube « Non répertoriée » ou Vimeo « Privé (lien) ». Évite « Public », et « Privée » sur YouTube (illisible sur OnlyPok).'
    : 'Contenu gratuit : une vidéo publique convient.'

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 8 }}>
      {parsed?.provider === 'youtube' && parsed.thumbnailUrl && (
        <Image src={parsed.thumbnailUrl} alt="Aperçu de la vidéo" width={112} height={63}
          style={{ borderRadius: 6, objectFit: 'cover', flexShrink: 0, border: '1px solid rgba(240,244,255,0.08)' }} />
      )}
      {parsed?.provider === 'vimeo' && (
        <iframe src={parsed.embedUrl} title="Aperçu de la vidéo Vimeo" loading="lazy" width={112} height={63}
          style={{ borderRadius: 6, border: '1px solid rgba(240,244,255,0.08)', flexShrink: 0, background: '#000' }} />
      )}
      <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {status && (
          <p role="status" aria-live="polite" style={{ fontSize: 11.5, color: status.color, margin: 0, lineHeight: 1.5 }}>{status.text}</p>
        )}
        <p style={{ fontSize: 11.5, color: isPaid ? PAID_COLOR : HINT_COLOR, margin: 0, lineHeight: 1.5 }}>{hint}</p>
      </div>
    </div>
  )
}
