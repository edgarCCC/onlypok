'use client'

type Props = {
  url: string
  type: 'youtube' | 'vimeo' | 'upload' | string
}

function getYoutubeId(url: string) {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)
  return match ? match[1] : null
}

function getVimeoId(url: string) {
  const match = url.match(/vimeo\.com\/(\d+)/)
  return match ? match[1] : null
}

export default function VideoPlayer({ url, type }: Props) {
  if (type === 'youtube' || url.includes('youtube') || url.includes('youtu.be')) {
    const id = getYoutubeId(url)
    if (!id) return <div style={{ color: 'var(--text-muted)' }}>URL YouTube invalide</div>
    return (
      <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, borderRadius: 12, overflow: 'hidden' }}>
        <iframe
          src={`https://www.youtube.com/embed/${id}`}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    )
  }

  if (type === 'vimeo' || url.includes('vimeo')) {
    const id = getVimeoId(url)
    if (!id) return <div style={{ color: 'var(--text-muted)' }}>URL Vimeo invalide</div>
    return (
      <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, borderRadius: 12, overflow: 'hidden' }}>
        <iframe
          src={`https://player.vimeo.com/video/${id}`}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
          allowFullScreen
        />
      </div>
    )
  }

  return (
    <video controls style={{ width: '100%', borderRadius: 12, background: '#000' }}>
      <source src={url} />
    </video>
  )
}
