'use client'

import { parseVideoUrl } from '@/lib/video-url'

type Props = {
  url: string
  type: 'youtube' | 'vimeo' | 'upload' | string
}

const IFRAME_STYLE: React.CSSProperties = { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }
const RATIO_BOX: React.CSSProperties = { position: 'relative', paddingBottom: '56.25%', height: 0, borderRadius: 12, overflow: 'hidden' }

export default function VideoPlayer({ url, type }: Props) {
  const parsed = parseVideoUrl(url)

  if (parsed?.provider === 'youtube') {
    return (
      <div style={RATIO_BOX}>
        <iframe
          src={parsed.embedUrl}
          title="Vidéo YouTube"
          style={IFRAME_STYLE}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    )
  }

  if (parsed?.provider === 'vimeo') {
    return (
      <div style={RATIO_BOX}>
        <iframe
          src={parsed.embedUrl}
          title="Vidéo Vimeo"
          style={IFRAME_STYLE}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
      </div>
    )
  }

  if (type === 'youtube' || url.includes('youtube') || url.includes('youtu.be')) {
    return <div style={{ color: 'var(--text-muted)' }}>URL YouTube invalide</div>
  }
  if (type === 'vimeo' || url.includes('vimeo')) {
    return <div style={{ color: 'var(--text-muted)' }}>URL Vimeo invalide</div>
  }

  return (
    <video controls style={{ width: '100%', borderRadius: 12, background: '#000' }}>
      <source src={url} />
    </video>
  )
}
