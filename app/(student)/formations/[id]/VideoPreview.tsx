'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { Lock, Share2, MessageSquare } from 'lucide-react'
import { CREAM, SILVER, getYtId, getVimeoId } from './shared'

/* ─── Full video player (purchased / free) ──────────────────────────────────── */
export function VideoPlayer({ url, type }: { url: string; type: string }) {
  if (type === 'youtube' || url.includes('youtu')) {
    const ytId = getYtId(url)
    if (!ytId) return null
    return (
      <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, borderRadius: 12, overflow: 'hidden' }}>
        <iframe src={`https://www.youtube.com/embed/${ytId}`}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
          allowFullScreen allow="autoplay; encrypted-media" />
      </div>
    )
  }
  if (type === 'vimeo' || url.includes('vimeo')) {
    const vimeoId = getVimeoId(url)
    if (!vimeoId) return null
    return (
      <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, borderRadius: 12, overflow: 'hidden' }}>
        <iframe src={`https://player.vimeo.com/video/${vimeoId}`}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
          allowFullScreen allow="autoplay; fullscreen" />
      </div>
    )
  }
  return <video controls src={url} style={{ width: '100%', borderRadius: 12 }} />
}

/* ─── 60-second preview player ──────────────────────────────────────────────── */
export default function VideoPreview({ url, type, color, onEnded }: {
  url: string; type: string; color: string; onEnded: () => void
}) {
  const [countdown, setCountdown] = useState(60)
  const [hasStarted, setHasStarted] = useState(false)
  const [ytError, setYtError] = useState(false)

  const countRef     = useRef(60)
  const intervalRef  = useRef<ReturnType<typeof setInterval> | null>(null)
  const nativeRef    = useRef<HTMLVideoElement>(null)
  const nativeMaxRef = useRef(0)           // furthest position watched in native video
  const ytPlayerRef  = useRef<any>(null)
  const ytDivId      = useRef(`yt-prev-${Math.random().toString(36).slice(2)}`)
  const onEndedRef   = useRef(onEnded)
  onEndedRef.current = onEnded

  /* ── timer controls ── */
  const startTimer = useCallback(() => {
    if (intervalRef.current) return
    setHasStarted(true)
    intervalRef.current = setInterval(() => {
      countRef.current -= 1
      setCountdown(countRef.current)
      if (countRef.current <= 0) {
        clearInterval(intervalRef.current!)
        intervalRef.current = null
        onEndedRef.current()
      }
    }, 1000)
  }, [])

  const pauseTimer = useCallback(() => {
    if (!intervalRef.current) return
    clearInterval(intervalRef.current)
    intervalRef.current = null
  }, [])

  useEffect(() => () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (ytPlayerRef.current) { try { ytPlayerRef.current.destroy() } catch {} }
  }, [])

  /* ── YouTube IFrame API ── */
  useEffect(() => {
    if (type !== 'youtube' && !url.includes('youtu')) return
    const ytId = getYtId(url)
    if (!ytId) return

    let seekPoller: ReturnType<typeof setInterval>

    const buildPlayer = () => {
      if (!document.getElementById(ytDivId.current)) return
      ytPlayerRef.current = new (window as any).YT.Player(ytDivId.current, {
        videoId: ytId,
        playerVars: { modestbranding: 1, rel: 0, fs: 1 },
        events: {
          onReady: () => {
            /* Poll every 500ms: if user seeked past allowed time, send them back */
            seekPoller = setInterval(() => {
              const p = ytPlayerRef.current
              if (!p?.getCurrentTime) return
              const current = p.getCurrentTime()
              const allowed = 60 - countRef.current   // seconds elapsed = max allowed position
              if (current > allowed + 0.5) p.seekTo(Math.max(0, allowed - 0.2), true)
            }, 500)
          },
          onStateChange: ({ data }: { data: number }) => {
            const S = (window as any).YT.PlayerState
            if (data === S.PLAYING) startTimer()
            else if (data === S.PAUSED) pauseTimer()
            else if (data === S.ENDED) { pauseTimer(); onEndedRef.current() }
          },
          onError: () => setYtError(true),
        },
      })
    }

    if ((window as any).YT?.Player) {
      buildPlayer()
    } else {
      if (!document.getElementById('yt-iframe-api')) {
        const tag = document.createElement('script')
        tag.id  = 'yt-iframe-api'
        tag.src = 'https://www.youtube.com/iframe_api'
        document.head.appendChild(tag)
      }
      const prev = (window as any).onYouTubeIframeAPIReady
      ;(window as any).onYouTubeIframeAPIReady = () => { if (prev) prev(); buildPlayer() }
    }

    return () => {
      if (seekPoller) clearInterval(seekPoller)
      if (ytPlayerRef.current) { try { ytPlayerRef.current.destroy() } catch {} ; ytPlayerRef.current = null }
    }
  }, [url, type, startTimer, pauseTimer])

  /* ── Vimeo postMessage ── */
  useEffect(() => {
    if (type !== 'vimeo' && !url.includes('vimeo')) return
    const handler = (e: MessageEvent) => {
      if (!e.data || typeof e.data !== 'string') return
      try {
        const d = JSON.parse(e.data)
        if (d.event === 'play')   startTimer()
        if (d.event === 'pause')  pauseTimer()
        if (d.event === 'finish') { pauseTimer(); onEndedRef.current() }
        /* If Vimeo reports playProgress past allowed time, trigger end */
        if (d.event === 'playProgress') {
          const allowed = 60 - countRef.current
          if (d.data?.seconds > allowed + 1) { pauseTimer(); onEndedRef.current() }
        }
      } catch {}
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [url, type, startTimer, pauseTimer])

  /* ── native video handlers ── */
  const handleNativePlay = () => startTimer()
  const handleNativePause = () => pauseTimer()
  const handleNativeTimeUpdate = () => {
    const v = nativeRef.current
    if (!v) return
    if (v.currentTime > nativeMaxRef.current) nativeMaxRef.current = v.currentTime
    if (v.currentTime >= 60) { v.pause(); onEndedRef.current() }
  }
  const handleNativeSeeking = () => {
    const v = nativeRef.current
    if (!v) return
    /* only allow seeking within already-watched content */
    if (v.currentTime > nativeMaxRef.current + 0.5) v.currentTime = nativeMaxRef.current
  }

  /* ── ring SVG ── */
  const r    = 9
  const circ = 2 * Math.PI * r
  const dash = (countdown / 60) * circ

  /* ── player JSX ── */
  let player: React.ReactNode
  if (type === 'youtube' || url.includes('youtu')) {
    if (ytError) {
      player = (
        <div style={{ aspectRatio: '16/9', background: '#0f1218', borderRadius: 12,
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 13, color: SILVER }}>Vidéo non disponible (privée ou supprimée)</span>
        </div>
      )
    } else {
      player = (
        <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, borderRadius: 12, overflow: 'hidden' }}>
          <div id={ytDivId.current} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
        </div>
      )
    }
  } else if (type === 'vimeo' || url.includes('vimeo')) {
    const vimeoId = getVimeoId(url)
    player = vimeoId ? (
      <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, borderRadius: 12, overflow: 'hidden' }}>
        <iframe
          src={`https://player.vimeo.com/video/${vimeoId}?api=1`}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
          allowFullScreen allow="autoplay; fullscreen" />
      </div>
    ) : null
  } else {
    player = (
      <video ref={nativeRef} controls src={url}
        onPlay={handleNativePlay} onPause={handleNativePause}
        onTimeUpdate={handleNativeTimeUpdate} onSeeking={handleNativeSeeking}
        style={{ width: '100%', borderRadius: 12 }} />
    )
  }

  return (
    <div style={{ position: 'relative' }}>
      {player}

      {/* Countdown badge */}
      <div style={{
        position: 'absolute', bottom: 14, right: 14,
        background: 'rgba(7,9,14,0.82)', backdropFilter: 'blur(10px)',
        border: `1px solid ${color}50`, borderRadius: 10, padding: '6px 10px 6px 8px',
        display: 'flex', alignItems: 'center', gap: 8,
        pointerEvents: 'none', zIndex: 5,
      }}>
        <svg width="22" height="22" style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
          <circle cx="11" cy="11" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2.5" />
          <circle cx="11" cy="11" r={r} fill="none" stroke={color} strokeWidth="2.5"
            strokeDasharray={`${dash} ${circ}`}
            style={{ transition: 'stroke-dasharray 0.9s linear' }} />
        </svg>
        <span style={{ fontSize: 12, fontWeight: 700, color: CREAM }}>
          {hasStarted ? `Aperçu · ${countdown}s` : `${countdown}s d'aperçu gratuit`}
        </span>
      </div>
    </div>
  )
}

/* ─── Sales-page video block (full player / preview / preview-ended lock) ───── */
export function SalesVideoSection({ videoUrl, videoType, canWatchFull, thumbnailUrl, typeColor, previewEnded, setPreviewEnded, paying, ctaLabel, onCTA }: {
  videoUrl: string
  videoType: string
  canWatchFull: boolean
  thumbnailUrl?: string | null
  typeColor: string
  previewEnded: boolean
  setPreviewEnded: (v: boolean) => void
  paying: boolean
  ctaLabel: string
  onCTA: () => void
}) {
  return (
    <div style={{ marginBottom: 32 }}>
      {canWatchFull ? (
        <>
          <VideoPlayer url={videoUrl} type={videoType} />
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <button onClick={() => { navigator.clipboard.writeText(window.location.href) }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(240,244,255,0.08)', background: 'transparent', color: SILVER, fontSize: 12, cursor: 'pointer' }}>
              <Share2 size={13} /> Partager
            </button>
            <button onClick={() => document.getElementById('comments-section')?.scrollIntoView({ behavior: 'smooth' })}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(240,244,255,0.08)', background: 'transparent', color: SILVER, fontSize: 12, cursor: 'pointer' }}>
              <MessageSquare size={13} /> Commenter
            </button>
          </div>
        </>
      ) : !previewEnded ? (
        <VideoPreview url={videoUrl} type={videoType} color={typeColor} onEnded={() => setPreviewEnded(true)} />
      ) : (
        <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', aspectRatio: '16/9' }}>
          {thumbnailUrl
            ? <img src={thumbnailUrl} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(8px) brightness(0.35)', transform: 'scale(1.05)' }} />
            : <div style={{ position: 'absolute', inset: 0, background: '#0d1017' }} />}
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24, textAlign: 'center' }}>
            <Lock size={20} color={SILVER} />
            <p style={{ fontSize: 15, fontWeight: 700, color: CREAM, margin: 0 }}>Fin de la prévisualisation</p>
            <p style={{ fontSize: 13, color: SILVER, margin: 0 }}>Achetez pour accéder au contenu complet</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setPreviewEnded(false)} style={{ padding: '9px 18px', borderRadius: 9, border: '1px solid rgba(232,228,220,0.15)', background: 'rgba(232,228,220,0.07)', color: CREAM, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>↩ Revoir</button>
              <button onClick={onCTA} disabled={paying} style={{ padding: '9px 20px', borderRadius: 9, border: 'none', background: typeColor, color: '#fff', fontSize: 13, fontWeight: 700, cursor: paying ? 'wait' : 'pointer' }}>{paying ? 'Redirection…' : ctaLabel}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
