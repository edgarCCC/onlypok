'use client'
import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import {
  ArrowLeft, Star, ChevronDown, ChevronUp, Lock, PlayCircle, CheckCircle,
  Clock, BookOpen, Zap, Shield, Check, X, Share2, MessageSquare, TrendingUp, Award,
  HelpCircle, Menu, Search,
} from 'lucide-react'
import Link from 'next/link'
import FourAcesLoader from '@/components/FourAcesLoader'
import ProofGalleryModal from '@/components/ProofGalleryModal'
import type { Proof } from '@/components/ProofGalleryModal'
import VideoStudio from '@/components/VideoStudio'
import { HIGHLIGHTS } from '@/lib/highlights'

const CREAM  = '#f0f4ff'
const SILVER = 'rgba(240,244,255,0.45)'

const VARIANT_COLORS: Record<string, string> = {
  NLH: '#7c3aed', PLO: '#a855f7', MTT: '#06b6d4',
  Cash: '#06b6d4', Expresso: '#e11d48', Live: '#a855f7',
}
const TYPE_COLORS: Record<string, string> = {
  formation: '#7c3aed', video: '#06b6d4', coaching: '#a855f7',
}
const TYPE_LABELS: Record<string, string> = {
  formation: 'Formation', video: 'Vidéo', coaching: 'Coaching',
}

const REVIEW_CATEGORIES = [
  { key: 'pedagogy',      label: 'Pédagogie',     desc: 'Qualité de l\'enseignement' },
  { key: 'clarity',       label: 'Clarté',         desc: 'Explications compréhensibles' },
  { key: 'communication', label: 'Communication',  desc: 'Échanges avec le coach' },
  { key: 'progress',      label: 'Progression',    desc: 'Amélioration ressentie' },
  { key: 'punctuality',   label: 'Ponctualité',    desc: 'Respect des horaires' },
  { key: 'value',         label: 'Qualité-prix',   desc: 'Rapport qualité / prix' },
]

const VARIANT_OPTIONS = [
  { id: 'MTT',      label: 'MTT',        desc: 'Tournois multi-tables',    color: '#a855f7' },
  { id: 'Cash',     label: 'Cash Game',  desc: 'Tables cash 6-max / HU',  color: '#06b6d4' },
  { id: 'Expresso', label: 'Expresso',   desc: 'Sit & Go hyper-turbo',    color: '#ef4444' },
  { id: 'Live',     label: 'Live',       desc: 'Poker en casino / cercle', color: '#7c3aed' },
  { id: 'PLO',      label: 'PLO',        desc: 'Pot-Limit Omaha',         color: '#8b5cf6' },
]

const HEADER_FIELDS: Record<string, { key: string; label: string; placeholder: string; options: string[] }[]> = {
  formations: [
    { key: 'variant',  label: 'Variante', placeholder: 'Toutes', options: VARIANT_OPTIONS.map(v => v.id) },
    { key: 'price',    label: 'Prix',     placeholder: 'Tous',   options: ['Gratuit', '< 30€', '30–60€', '> 60€'] },
    { key: 'duration', label: 'Durée',    placeholder: 'Toutes', options: ['< 2h', '2h – 5h', '> 5h'] },
  ],
  videos: [
    { key: 'variant',  label: 'Variante', placeholder: 'Toutes', options: VARIANT_OPTIONS.map(v => v.id) },
    { key: 'level',    label: 'Niveau',   placeholder: 'Tous',   options: ['Débutant', 'Intermédiaire', 'Avancé'] },
    { key: 'duration', label: 'Durée',    placeholder: 'Toutes', options: ['< 15min', '15–45min', '> 45min'] },
  ],
  coaching: [
    { key: 'variant',  label: 'Variante',      placeholder: 'Toutes', options: VARIANT_OPTIONS.map(v => v.id) },
    { key: 'budget',   label: 'Budget',         placeholder: 'Tous',   options: ['< 50€/h', '50–100€/h', '> 100€/h'] },
    { key: 'dispo',    label: 'Disponibilité',  placeholder: 'Quand ?',options: ['Cette semaine', 'Ce mois', 'Flexible'] },
  ],
}

const HEADER_TAB_COLORS: Record<string, string> = {
  formations: '#7c3aed', videos: '#06b6d4', coaching: '#a855f7',
}

/* ─── helpers ───────────────────────────────────────────────────────────────── */
const getYtId    = (u: string) => u.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)?.[1]
const getVimeoId = (u: string) => u.match(/vimeo\.com\/(\d+)/)?.[1]

/* ─── Full video player (purchased / free) ──────────────────────────────────── */
function VideoPlayer({ url, type }: { url: string; type: string }) {
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
function VideoPreview({ url, type, color, onEnded }: {
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

/* ─── Star picker ──────────────────────────────────────────────────────────── */
function StarPicker({ value, onChange }: { value: number, onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0)
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <button key={i} type="button"
          onMouseEnter={() => setHovered(i)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(i)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
          <Star size={22} color="#a855f7"
            fill={(hovered || value) >= i ? '#a855f7' : 'none'}
            style={{ opacity: (hovered || value) >= i ? 1 : 0.3, transition: 'all 0.1s' }} />
        </button>
      ))}
    </div>
  )
}

/* ─── Feature row ──────────────────────────────────────────────────────────── */
function Feature({ icon, label, color }: { icon: React.ReactNode, label: string, color?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ color: color ?? SILVER, flexShrink: 0 }}>{icon}</span>
      <span style={{ fontSize: 12, color: SILVER }}>{label}</span>
    </div>
  )
}

function HighlightRow({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20 }}>
      <span style={{ color: CREAM, flexShrink: 0, marginTop: 2 }}>{icon}</span>
      <div>
        <p style={{ fontSize: 15, fontWeight: 600, color: CREAM, margin: '0 0 2px' }}>{title}</p>
        <p style={{ fontSize: 13, color: SILVER, margin: 0, lineHeight: 1.5 }}>{desc}</p>
      </div>
    </div>
  )
}

/* ─── helpers temps relatif ─────────────────────────────────────────────────── */
function timeAgo(dateStr: string) {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
  if (days === 0) return "Aujourd'hui"
  if (days < 7)  return `Il y a ${days} jour${days > 1 ? 's' : ''}`
  if (days < 30) { const w = Math.floor(days / 7);  return `Il y a ${w} semaine${w > 1 ? 's' : ''}` }
  if (days < 365){ const m = Math.floor(days / 30);  return `Il y a ${m} mois` }
  const y = Math.floor(days / 365); return `Il y a ${y} an${y > 1 ? 's' : ''}`
}

function memberSince(dateStr: string) {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
  if (days < 30)  return 'Nouveau sur OnlyPok'
  if (days < 365) { const m = Math.floor(days / 30);  return `${m} mois sur OnlyPok` }
  const y = Math.floor(days / 365); return `${y} an${y > 1 ? 's' : ''} sur OnlyPok`
}

/* ─── Review Card style Airbnb ──────────────────────────────────────────────── */
function ReviewCard({ r, typeColor }: { r: any; typeColor: string }) {
  const [expanded, setExpanded] = useState(false)
  const username  = r.student?.username ?? 'Élève'
  const initial   = username[0].toUpperCase()
  const joinedAt  = r.student?.created_at
  const long      = (r.comment?.length ?? 0) > 200

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Auteur */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
          background: `linear-gradient(135deg, ${typeColor}, ${typeColor}80)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, fontWeight: 800, color: '#fff',
        }}>{initial}</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: CREAM }}>{username}</div>
          <div style={{ fontSize: 12, color: SILVER, marginTop: 2 }}>
            {joinedAt ? memberSince(joinedAt) : 'Membre OnlyPok'}
          </div>
        </div>
      </div>

      {/* Étoiles + date */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ display: 'flex', gap: 2 }}>
          {[1,2,3,4,5].map(i => (
            <Star key={i} size={13} color="#a855f7"
              fill={i <= r.rating ? '#a855f7' : 'none'}
              style={{ opacity: i <= r.rating ? 1 : 0.2 }} />
          ))}
        </div>
        <span style={{ fontSize: 12, color: SILVER }}>·</span>
        <span style={{ fontSize: 12, color: SILVER }}>{timeAgo(r.created_at)}</span>
      </div>

      {/* Commentaire */}
      {r.comment && (
        <div>
          <p style={{
            fontSize: 14, color: 'rgba(232,228,220,0.75)', lineHeight: 1.7, margin: 0,
            display: !expanded && long ? '-webkit-box' : 'block',
            WebkitLineClamp: !expanded && long ? 4 : undefined,
            WebkitBoxOrient: !expanded && long ? 'vertical' : undefined,
            overflow: !expanded && long ? 'hidden' : 'visible',
          } as React.CSSProperties}>
            {r.comment}
          </p>
          {long && (
            <button onClick={() => setExpanded(v => !v)}
              style={{ marginTop: 8, fontSize: 13, fontWeight: 700, color: CREAM,
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                textDecoration: 'underline', textUnderlineOffset: 3 }}>
              {expanded ? 'Réduire' : 'Lire la suite'}
            </button>
          )}
        </div>
      )}

      {/* Séparateur */}
      <div style={{ borderBottom: '1px solid rgba(232,228,220,0.06)', marginTop: 4 }} />
    </div>
  )
}

/* ─── Rating Detail complet style Airbnb ────────────────────────────────────── */
const FULL_CATS: { key: string; label: string; Icon: React.ElementType }[] = [
  { key: 'pedagogy',      label: 'Pédagogie',    Icon: BookOpen },
  { key: 'clarity',       label: 'Clarté',        Icon: Star },
  { key: 'communication', label: 'Communication', Icon: MessageSquare },
  { key: 'progress',      label: 'Progression',   Icon: TrendingUp },
  { key: 'punctuality',   label: 'Ponctualité',   Icon: Clock },
  { key: 'value',         label: 'Qualité-prix',  Icon: Award },
]

function RatingDetailFull({ avgRating, distribution, categoryAvgs, accentColor }: {
  avgRating: number
  distribution: { star: number; count: number; pct: number }[]
  categoryAvgs: { key: string; label: string; avg: number }[]
  accentColor: string
}) {
  const maxCount = Math.max(...distribution.map(d => d.count), 1)
  const { title, desc } = ratingLabel(avgRating)
  const catWithIcons = FULL_CATS.map(fc => ({
    ...fc,
    avg: categoryAvgs.find(c => c.key === fc.key)?.avg ?? avgRating,
  }))

  return (
    <div style={{ paddingBottom: 36, marginBottom: 28, borderBottom: '1px solid rgba(232,228,220,0.07)' }}>

      {/* ── Score centré avec lauriers ── */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
          {/* Laurier gauche */}
          <svg width="48" height="56" viewBox="0 0 48 56" fill="none" style={{ opacity: 0.55, color: accentColor }}>
            <path d="M24 4 C18 10 8 14 6 22 C4 30 10 36 16 38 C12 32 14 24 20 20 C16 28 18 36 24 40 C20 34 20 26 26 22 C22 30 24 38 30 40 C26 36 24 28 28 24 C32 28 32 36 28 40 C34 38 40 32 38 22 C36 14 26 10 24 4Z" fill="currentColor"/>
          </svg>
          <span style={{ fontSize: 80, fontWeight: 900, color: CREAM, letterSpacing: '-4px', lineHeight: 1 }}>
            {avgRating.toFixed(2).replace('.', ',')}
          </span>
          {/* Laurier droit (miroir) */}
          <svg width="48" height="56" viewBox="0 0 48 56" fill="none" style={{ opacity: 0.55, color: accentColor, transform: 'scaleX(-1)' }}>
            <path d="M24 4 C18 10 8 14 6 22 C4 30 10 36 16 38 C12 32 14 24 20 20 C16 28 18 36 24 40 C20 34 20 26 26 22 C22 30 24 38 30 40 C26 36 24 28 28 24 C32 28 32 36 28 40 C34 38 40 32 38 22 C36 14 26 10 24 4Z" fill="currentColor"/>
          </svg>
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: CREAM, marginBottom: 8 }}>{title}</div>
        <div style={{ fontSize: 13, color: SILVER, lineHeight: 1.65, maxWidth: 380, textAlign: 'center' }}>{desc}</div>
      </div>

      {/* ── Séparateur ── */}
      <div style={{ borderTop: '1px solid rgba(232,228,220,0.07)', marginBottom: 28 }} />

      {/* ── Grille : distribution + 6 catégories ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '170px repeat(6, 1fr)', gap: 0 }}>

        {/* Colonne distribution */}
        <div style={{ paddingRight: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: CREAM, marginBottom: 14 }}>Évaluation globale</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {distribution.map(d => (
              <div key={d.star} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, color: SILVER, width: 8, flexShrink: 0 }}>{d.star}</span>
                <div style={{ flex: 1, height: 3, background: 'rgba(232,228,220,0.08)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${(d.count / maxCount) * 100}%`,
                    background: CREAM,
                    borderRadius: 99, transition: 'width 0.6s ease',
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 6 colonnes catégories */}
        {catWithIcons.map(cat => (
          <div key={cat.key} style={{
            display: 'flex', flexDirection: 'column', gap: 10,
            paddingLeft: 20, borderLeft: '1px solid rgba(232,228,220,0.07)',
          }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: CREAM, letterSpacing: '-0.5px' }}>
              {cat.avg.toFixed(1)}
            </span>
            <span style={{ fontSize: 12, color: SILVER, lineHeight: 1.3 }}>{cat.label}</span>
            <cat.Icon size={20} color={CREAM} style={{ opacity: 0.5 }} />
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Rating Badge horizontal (Image Airbnb) ────────────────────────────────── */
function ratingLabel(avg: number): { title: string; desc: string } {
  if (avg >= 4.8) return { title: 'Top Coach',       desc: 'Parmi les meilleurs coaches poker de la communauté OnlyPok.' }
  if (avg >= 4.5) return { title: 'Très recommandé', desc: 'Très bien noté par les élèves de la communauté OnlyPok.' }
  if (avg >= 4.0) return { title: 'Bien évalué',     desc: 'Reçoit une note favorable de la part des élèves.' }
  return               { title: 'Évalué',             desc: 'Évalué par la communauté des joueurs OnlyPok.' }
}

function RatingHeroDetail({ avgRating, reviewCount, accentColor }: {
  avgRating: number
  reviewCount: number
  accentColor: string
}) {
  const { title, desc } = ratingLabel(avgRating)
  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(232,228,220,0.08)',
      borderRadius: 16, padding: '20px 28px', gap: 0,
    }}>
      {/* ♠ Label ♠ */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingRight: 28, flexShrink: 0 }}>
        <span style={{ fontSize: 24, color: accentColor, opacity: 0.6, lineHeight: 1 }}>♠</span>
        <span style={{ fontSize: 15, fontWeight: 800, color: CREAM, lineHeight: 1.3 }}>{title}</span>
        <span style={{ fontSize: 24, color: accentColor, opacity: 0.6, lineHeight: 1 }}>♠</span>
      </div>

      <div style={{ width: 1, alignSelf: 'stretch', background: 'rgba(232,228,220,0.08)', margin: '0 28px', flexShrink: 0 }} />

      {/* Description */}
      <p style={{ fontSize: 13, color: SILVER, lineHeight: 1.55, flex: 1, margin: 0 }}>{desc}</p>

      <div style={{ width: 1, alignSelf: 'stretch', background: 'rgba(232,228,220,0.08)', margin: '0 28px', flexShrink: 0 }} />

      {/* Score */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
        <span style={{ fontSize: 28, fontWeight: 900, color: CREAM, letterSpacing: '-1px', lineHeight: 1 }}>
          {avgRating.toFixed(2).replace('.', ',')}
        </span>
        <div style={{ display: 'flex', gap: 2 }}>
          {[1,2,3,4,5].map(i => (
            <Star key={i} size={11} color="#a855f7"
              fill={i <= Math.round(avgRating) ? '#a855f7' : 'none'}
              style={{ opacity: i <= Math.round(avgRating) ? 1 : 0.2 }} />
          ))}
        </div>
      </div>

      <div style={{ width: 1, alignSelf: 'stretch', background: 'rgba(232,228,220,0.08)', margin: '0 28px', flexShrink: 0 }} />

      {/* Count */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: 28, fontWeight: 900, color: CREAM, letterSpacing: '-1px', lineHeight: 1 }}>{reviewCount}</span>
        <span style={{ fontSize: 12, color: SILVER, marginTop: 4 }}>Avis</span>
      </div>
    </div>
  )
}

/* ─── Rank SVG components (inlined from ranks.jsx) ──────────────────────── */
function RankFish1({ size = 200 }: { size?: number }) {
  return (
    <svg viewBox="0 0 200 140" width={size} height={(size * 140) / 200} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="rf1-body" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#aab8c5" /><stop offset="100%" stopColor="#6c7a89" />
        </linearGradient>
        <linearGradient id="rf1-belly" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#cfd8e0" /><stop offset="100%" stopColor="#94a2b0" />
        </linearGradient>
      </defs>
      <path d="M40 70 L18 50 L22 70 L18 92 Z" fill="#6c7a89" opacity="0.85" />
      <path d="M40 70 Q70 38 122 50 Q160 60 168 70 Q160 82 122 92 Q70 104 40 70 Z" fill="url(#rf1-body)" />
      <path d="M58 78 Q90 96 130 88 Q150 84 158 76 Q140 92 110 96 Q80 98 58 78 Z" fill="url(#rf1-belly)" opacity="0.7" />
      <path d="M88 88 L98 104 L108 90 Z" fill="#7e8c9b" />
      <path d="M132 60 Q128 70 132 82" stroke="#4d5862" strokeWidth="1.2" fill="none" />
      <circle cx="150" cy="68" r="4.5" fill="#1a2028" />
      <circle cx="151.2" cy="66.6" r="1.4" fill="#e6ecf2" />
      <path d="M166 72 Q170 74 166 76" stroke="#4d5862" strokeWidth="1.2" fill="none" />
      <circle cx="180" cy="58" r="2" fill="#aab8c5" opacity="0.5" />
      <circle cx="186" cy="50" r="1.2" fill="#aab8c5" opacity="0.4" />
    </svg>
  )
}

function RankFish2({ size = 200 }: { size?: number }) {
  return (
    <svg viewBox="0 0 200 140" width={size} height={(size * 140) / 200} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="rf2-body" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#5b86b8" /><stop offset="55%" stopColor="#2f5d8e" /><stop offset="100%" stopColor="#1d3f64" />
        </linearGradient>
        <linearGradient id="rf2-belly" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#7da4cf" /><stop offset="100%" stopColor="#3e6a98" />
        </linearGradient>
      </defs>
      <path d="M30 70 L8 44 L24 64 L8 96 L30 72 Z" fill="#244c77" />
      <path d="M30 70 L14 50 L26 66 L14 90 L30 72 Z" fill="#3a6a9e" opacity="0.7" />
      <path d="M30 70 Q60 30 130 44 Q170 54 180 70 Q170 86 130 96 Q60 110 30 70 Z" fill="url(#rf2-body)" />
      <path d="M48 84 Q90 102 140 92 Q160 88 172 78 Q150 100 110 102 Q72 102 48 84 Z" fill="url(#rf2-belly)" opacity="0.75" />
      <path d="M82 92 L92 110 L106 94 Z" fill="#1d3f64" />
      <path d="M110 78 Q120 96 134 88 Q124 82 110 78 Z" fill="#244c77" />
      <path d="M50 72 Q100 70 168 72" stroke="#7da4cf" strokeWidth="0.8" fill="none" opacity="0.5" />
      <path d="M138 56 Q134 70 138 86" stroke="#0f2540" strokeWidth="1.4" fill="none" />
      <circle cx="158" cy="66" r="5.5" fill="#0a1422" />
      <circle cx="158" cy="66" r="3" fill="#5dc8ff" />
      <circle cx="158" cy="66" r="1.6" fill="#0a1422" />
      <circle cx="159.2" cy="64.4" r="0.9" fill="#ffffff" />
      <path d="M174 70 Q179 74 174 78" stroke="#0f2540" strokeWidth="1.4" fill="none" />
    </svg>
  )
}

function RankFish3({ size = 200 }: { size?: number }) {
  return (
    <svg viewBox="0 0 200 140" width={size} height={(size * 140) / 200} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="rf3-body" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#3fd2ff" /><stop offset="50%" stopColor="#1a7fb8" /><stop offset="100%" stopColor="#0c2f4a" />
        </linearGradient>
        <linearGradient id="rf3-belly" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#7fe4ff" /><stop offset="100%" stopColor="#1a7fb8" />
        </linearGradient>
        <radialGradient id="rf3-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#3fd2ff" stopOpacity="0.6" /><stop offset="100%" stopColor="#3fd2ff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="100" cy="70" rx="95" ry="40" fill="url(#rf3-glow)" opacity="0.5" />
      <path d="M28 70 L4 38 L18 56 L2 72 L18 84 L4 102 Z" fill="#0c2f4a" />
      <path d="M28 70 L10 46 L22 60 L10 86 L28 72 Z" fill="#1a7fb8" opacity="0.8" />
      <path d="M28 70 Q56 24 132 38 Q176 48 188 70 Q176 90 132 100 Q56 116 28 70 Z" fill="url(#rf3-body)" />
      <path d="M44 86 Q92 106 144 96 Q170 90 184 78 Q160 106 116 108 Q70 108 44 86 Z" fill="url(#rf3-belly)" opacity="0.6" />
      <path d="M78 96 L90 116 L112 98 Z" fill="#0c2f4a" />
      <path d="M118 80 Q132 102 150 92 Q138 84 118 80 Z" fill="#0c2f4a" />
      {[0,1,2,3,4].map(i => (
        <path key={i} d={`M${70+i*16} 64 Q${78+i*16} 70 ${70+i*16} 76`} stroke="#7fe4ff" strokeWidth="0.6" fill="none" opacity="0.45" />
      ))}
      <path d="M142 50 L148 70 L142 90" stroke="#06121e" strokeWidth="1.6" fill="none" />
      <circle cx="166" cy="64" r="6.5" fill="#06121e" />
      <circle cx="166" cy="64" r="4" fill="#3fd2ff" />
      <path d="M163.5 62.5 Q166 60 168.5 62.5" stroke="#06121e" strokeWidth="2" fill="none" strokeLinecap="round" />
      <circle cx="166" cy="65" r="1.4" fill="#06121e" />
      <circle cx="167.4" cy="62.5" r="0.8" fill="#ffffff" />
      <path d="M180 68 L188 70 L180 74" stroke="#06121e" strokeWidth="1.6" fill="none" strokeLinejoin="round" />
    </svg>
  )
}

function RankShark1({ size = 200 }: { size?: number }) {
  return (
    <svg viewBox="0 0 200 140" width={size} height={(size * 140) / 200} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="rs1-body" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#3a4452" /><stop offset="55%" stopColor="#1f2731" /><stop offset="100%" stopColor="#0d1219" />
        </linearGradient>
        <linearGradient id="rs1-belly" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#5a6675" /><stop offset="100%" stopColor="#2a323d" />
        </linearGradient>
      </defs>
      <path d="M22 70 L4 38 L20 60 L8 70 L20 80 L4 102 Z" fill="#0d1219" />
      <path d="M22 70 L10 46 L20 64 L20 76 L10 94 Z" fill="#2a323d" opacity="0.7" />
      <path d="M22 70 Q50 42 124 48 Q170 54 188 70 Q170 86 124 92 Q50 98 22 70 Z" fill="url(#rs1-body)" />
      <path d="M40 82 Q90 96 150 88 Q174 84 184 76 L184 78 Q160 96 116 98 Q66 98 40 82 Z" fill="url(#rs1-belly)" />
      <path d="M44 80 Q92 92 152 84 Q172 80 182 74" stroke="#e8eef5" strokeWidth="0.6" fill="none" opacity="0.4" />
      <path d="M76 50 L94 18 L112 50 Z" fill="#0d1219" />
      <path d="M94 18 L112 50 L102 38 Z" fill="#3a4452" opacity="0.6" />
      <path d="M132 54 L142 42 L150 56 Z" fill="#0d1219" />
      <path d="M88 82 L72 108 L108 92 Z" fill="#0d1219" />
      <path d="M88 82 L78 100 L102 90 Z" fill="#1f2731" opacity="0.8" />
      <path d="M124 90 L132 104 L144 92 Z" fill="#0d1219" />
      {[0,1,2,3,4].map(i => (
        <path key={i} d={`M${136+i*4} 60 Q${134+i*4} 70 ${136+i*4} 80`} stroke="#06090e" strokeWidth="1.1" fill="none" />
      ))}
      <circle cx="166" cy="66" r="3" fill="#06090e" />
      <circle cx="166" cy="66" r="1.8" fill="#e8eef5" />
      <circle cx="166.4" cy="65.4" r="0.7" fill="#06090e" />
      <path d="M178 72 L188 74 L184 78 L176 76" fill="#06090e" />
      <path d="M180 74 L181 76 L182.5 74 L183.5 76 L184.5 74" stroke="#e8eef5" strokeWidth="0.5" fill="none" />
      <circle cx="180" cy="66" r="0.8" fill="#06090e" />
    </svg>
  )
}

function RankShark2({ size = 200 }: { size?: number }) {
  return (
    <svg viewBox="0 0 200 140" width={size} height={(size * 140) / 200} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="rs2-body" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#4a5260" /><stop offset="50%" stopColor="#242c38" /><stop offset="100%" stopColor="#0a0e15" />
        </linearGradient>
        <linearGradient id="rs2-belly" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#6a7585" /><stop offset="100%" stopColor="#2a323d" />
        </linearGradient>
      </defs>
      <path d="M20 70 L2 32 L18 56 L4 70 L18 84 L2 108 Z" fill="#0a0e15" />
      <path d="M20 70 L8 42 L18 60 L18 80 L8 98 Z" fill="#242c38" opacity="0.8" />
      <path d="M20 70 Q44 36 124 42 Q174 50 192 70 Q174 90 124 98 Q44 104 20 70 Z" fill="url(#rs2-body)" />
      <path d="M36 84 Q88 100 148 92 Q176 88 188 78 Q162 100 116 102 Q60 102 36 84 Z" fill="url(#rs2-belly)" />
      <path d="M70 56 L82 64" stroke="#8c98a8" strokeWidth="1.4" fill="none" strokeLinecap="round" opacity="0.85" />
      <path d="M76 50 L86 62" stroke="#8c98a8" strokeWidth="1.4" fill="none" strokeLinecap="round" opacity="0.85" />
      <path d="M82 52 L92 60" stroke="#8c98a8" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.7" />
      <path d="M110 84 L122 78" stroke="#8c98a8" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.7" />
      <path d="M114 88 L124 82" stroke="#8c98a8" strokeWidth="1.0" fill="none" strokeLinecap="round" opacity="0.6" />
      <path d="M74 48 L92 14 L96 22 L100 16 L114 50 Z" fill="#0a0e15" />
      <path d="M92 14 L100 16 L96 22 Z" fill="#242c38" />
      <path d="M96 22 L114 50 L104 36 Z" fill="#4a5260" opacity="0.5" />
      <path d="M134 54 L144 40 L152 56 Z" fill="#0a0e15" />
      <path d="M88 84 L70 110 L82 102 L78 112 L106 94 Z" fill="#0a0e15" />
      <path d="M88 84 L78 100 L102 92 Z" fill="#242c38" opacity="0.8" />
      <path d="M124 92 L132 108 L146 94 Z" fill="#0a0e15" />
      {[0,1,2,3,4].map(i => (
        <path key={i} d={`M${136+i*4} 58 Q${134+i*4} 70 ${136+i*4} 82`} stroke="#04070b" strokeWidth="1.2" fill="none" />
      ))}
      <path d="M158 56 L174 76" stroke="#8c98a8" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.85" />
      <circle cx="166" cy="66" r="3.4" fill="#04070b" />
      <circle cx="166" cy="66" r="2" fill="#e8eef5" />
      <circle cx="166.5" cy="65.5" r="0.8" fill="#04070b" />
      <path d="M176 72 L192 72 L190 80 L174 78 Z" fill="#04070b" />
      <path d="M178 73 L179 76 L181 73 L182.5 76 L184 73 L185.5 76 L187 73 L188.5 76" stroke="#e8eef5" strokeWidth="0.55" fill="none" />
      <path d="M178 78 L179.5 76 L181 78 L182.5 76 L184 78" stroke="#e8eef5" strokeWidth="0.45" fill="none" opacity="0.7" />
      <circle cx="180" cy="64" r="0.9" fill="#04070b" />
    </svg>
  )
}

function RankShark3({ size = 200 }: { size?: number }) {
  return (
    <svg viewBox="0 0 200 140" width={size} height={(size * 140) / 200} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="rs3-body" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#5a6271" /><stop offset="50%" stopColor="#262e3a" /><stop offset="100%" stopColor="#06090e" />
        </linearGradient>
        <linearGradient id="rs3-belly" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#8893a4" /><stop offset="100%" stopColor="#2c343f" />
        </linearGradient>
        <linearGradient id="rs3-gold" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#fff1b5" /><stop offset="50%" stopColor="#e9c267" /><stop offset="100%" stopColor="#a87a1f" />
        </linearGradient>
        <radialGradient id="rs3-eyeglow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#ffd86b" stopOpacity="1" />
          <stop offset="60%" stopColor="#e9a52a" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#e9a52a" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="rs3-aura" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#e9c267" stopOpacity="0.25" /><stop offset="100%" stopColor="#e9c267" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="100" cy="70" rx="98" ry="48" fill="url(#rs3-aura)" />
      <path d="M16 70 L0 26 L16 54 L2 70 L16 86 L0 114 Z" fill="#06090e" />
      <path d="M16 70 L4 36 L16 58 L16 82 L4 104 Z" fill="#262e3a" opacity="0.85" />
      <path d="M0 26 L16 54" stroke="url(#rs3-gold)" strokeWidth="0.8" fill="none" opacity="0.9" />
      <path d="M0 114 L16 86" stroke="url(#rs3-gold)" strokeWidth="0.8" fill="none" opacity="0.9" />
      <path d="M16 70 Q40 32 124 40 Q178 48 196 70 Q178 92 124 100 Q40 108 16 70 Z" fill="url(#rs3-body)" />
      <path d="M32 86 Q86 102 150 94 Q180 90 192 80 Q166 102 116 104 Q56 104 32 86 Z" fill="url(#rs3-belly)" />
      <path d="M30 72 Q100 64 188 70" stroke="url(#rs3-gold)" strokeWidth="0.7" fill="none" opacity="0.8" />
      <path d="M70 46 L92 8 L116 50 Z" fill="#06090e" />
      <path d="M92 8 L116 50 L106 36 Z" fill="#262e3a" />
      <path d="M70 46 L92 8 L116 50" stroke="url(#rs3-gold)" strokeWidth="1.2" fill="none" />
      <path d="M134 52 L146 36 L156 56 Z" fill="#06090e" />
      <path d="M134 52 L146 36 L156 56" stroke="url(#rs3-gold)" strokeWidth="0.7" fill="none" opacity="0.85" />
      <path d="M86 84 L62 116 L108 96 Z" fill="#06090e" />
      <path d="M86 84 L74 104 L104 94 Z" fill="#262e3a" opacity="0.85" />
      <path d="M86 84 L62 116" stroke="url(#rs3-gold)" strokeWidth="1" fill="none" />
      <path d="M126 96 L132 112 L150 96 Z" fill="#06090e" />
      <path d="M76 56 L86 62" stroke="#a8b3c2" strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.6" />
      <path d="M82 50 L90 60" stroke="#a8b3c2" strokeWidth="0.8" fill="none" strokeLinecap="round" opacity="0.5" />
      {[0,1,2,3,4].map(i => (
        <path key={i} d={`M${134+i*4.5} 56 Q${132+i*4.5} 70 ${134+i*4.5} 84`} stroke="#02050a" strokeWidth="1.3" fill="none" />
      ))}
      <circle cx="168" cy="64" r="9" fill="url(#rs3-eyeglow)" />
      <circle cx="168" cy="64" r="4.2" fill="#02050a" />
      <circle cx="168" cy="64" r="3" fill="#ffd86b" />
      <circle cx="168" cy="64" r="1.6" fill="#02050a" />
      <circle cx="168.6" cy="63.2" r="0.7" fill="#fff7d8" />
      <path d="M174 72 L194 72 L192 82 L172 78 Z" fill="#02050a" />
      <path d="M176 73 L177 77 L179 73 L180.5 77 L182 73 L183.5 77 L185 73 L186.5 77 L188 73 L189.5 77 L191 73"
        stroke="#f3f6fa" strokeWidth="0.6" fill="none" />
      <path d="M176 78 L177.5 76 L179 78 L180.5 76 L182 78 L183.5 76 L185 78 L186.5 76 L188 78"
        stroke="#f3f6fa" strokeWidth="0.5" fill="none" opacity="0.8" />
      <circle cx="182" cy="62" r="0.9" fill="#02050a" />
      <circle cx="92" cy="6" r="1.4" fill="url(#rs3-gold)" />
      <circle cx="92" cy="6" r="3" fill="url(#rs3-gold)" opacity="0.25" />
    </svg>
  )
}

/* ─── Coach tier definitions ─────────────────────────────────────────────── */
const COACH_TIERS = {
  fish1:  { label: 'Beginner',    sub: 'FISH · I',     tier: 'STUDENT', accent: '#94a8be', glow: 'rgba(148,168,190,0.18)' },
  fish2:  { label: 'Grinder',     sub: 'FISH · II',    tier: 'STUDENT', accent: '#5dc8ff', glow: 'rgba(93,200,255,0.22)'  },
  fish3:  { label: 'Regular',     sub: 'FISH · III',   tier: 'STUDENT', accent: '#3fd2ff', glow: 'rgba(63,210,255,0.30)'  },
  shark1: { label: 'New Coach',   sub: 'SHARK · I',    tier: 'COACH',   accent: '#e8eef5', glow: 'rgba(232,238,245,0.18)' },
  shark2: { label: 'Veteran',     sub: 'SHARK · II',   tier: 'COACH',   accent: '#cdd6e2', glow: 'rgba(205,214,226,0.22)' },
  shark3: { label: 'Apex Master', sub: 'SHARK · III',  tier: 'COACH',   accent: '#ffd86b', glow: 'rgba(255,216,107,0.28)' },
} as const
type CoachTierKey = keyof typeof COACH_TIERS

function getCoachTierKey(avgRating: number | null, isSuperCoach: boolean): CoachTierKey {
  if (isSuperCoach || (avgRating !== null && avgRating >= 4.8)) return 'shark3'
  if (avgRating === null)   return 'fish1'
  if (avgRating >= 4.5)     return 'shark2'
  if (avgRating >= 4.0)     return 'shark1'
  if (avgRating >= 3.5)     return 'fish3'
  if (avgRating >= 3.0)     return 'fish2'
  return 'fish1'
}

const RANK_SVG_MAP: Record<CoachTierKey, (size: number) => React.ReactElement> = {
  fish1:  size => <RankFish1  size={size} />,
  fish2:  size => <RankFish2  size={size} />,
  fish3:  size => <RankFish3  size={size} />,
  shark1: size => <RankShark1 size={size} />,
  shark2: size => <RankShark2 size={size} />,
  shark3: size => <RankShark3 size={size} />,
}

/* ─── Coach Card (ProfileCard style) ────────────────────────────────────── */
function CoachIridescentCard({ coach, avgRating, reviewCount, isSuperCoach }: {
  coach: any; avgRating: number | null; reviewCount: number; isSuperCoach: boolean; accentColor: string
}) {
  const tierKey = getCoachTierKey(avgRating, isSuperCoach)
  const tier    = COACH_TIERS[tierKey]

  const yearsOnPlatform = coach.created_at
    ? Math.max(0, new Date().getFullYear() - new Date(coach.created_at).getFullYear())
    : null

  return (
    <div style={{
      width: 280,
      background: 'linear-gradient(180deg, #11151c 0%, #0a0d12 100%)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 18,
      overflow: 'hidden',
      fontFamily: "'Inter', system-ui, sans-serif",
      color: '#e8eef5',
      flexShrink: 0,
      boxShadow: '0 20px 40px -10px rgba(0,0,0,0.7)',
    }}>
      {/* ── Hero ── */}
      <div style={{ height: 160, position: 'relative', overflow: 'hidden', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: `radial-gradient(ellipse at 50% 40%, ${tier.glow} 0%, transparent 60%), repeating-linear-gradient(0deg, rgba(255,255,255,0.015) 0 1px, transparent 1px 24px), repeating-linear-gradient(90deg, rgba(255,255,255,0.015) 0 1px, transparent 1px 24px)`,
        }} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {RANK_SVG_MAP[tierKey](200)}
        </div>
        <div style={{
          position: 'absolute', top: 12, left: 12,
          fontSize: 9, letterSpacing: '0.18em', color: tier.accent, fontWeight: 600,
          padding: '4px 8px', borderRadius: 4,
          background: 'rgba(0,0,0,0.4)', border: `1px solid ${tier.accent}33`,
          backdropFilter: 'blur(4px)',
        }}>
          {tier.tier}
        </div>
        <div style={{
          position: 'absolute', top: 12, right: 12,
          fontSize: 9, letterSpacing: '0.18em', color: 'rgba(232,238,245,0.6)', fontWeight: 500,
          padding: '4px 8px', borderRadius: 4,
          background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(4px)',
        }}>
          {tier.sub}
        </div>
        {isSuperCoach && (
          <div style={{
            position: 'absolute', bottom: 10, right: 12,
            display: 'flex', alignItems: 'center', gap: 4,
            fontSize: 9, fontWeight: 600, letterSpacing: '0.1em', color: '#ffd86b',
            padding: '4px 8px', borderRadius: 4,
            background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,216,107,0.3)',
          }}>
            <Award size={9} />
            SUPER COACH
          </div>
        )}
      </div>

      {/* ── Body ── */}
      <div style={{ padding: '16px 18px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#e8eef5', letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>
            {coach.username}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(232,238,245,0.45)', fontFamily: 'monospace', flexShrink: 0 }}>
            @{coach.username?.toLowerCase()}
          </div>
        </div>
        <div style={{ fontSize: 10, color: tier.accent, letterSpacing: '0.04em', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 4, height: 4, borderRadius: 999, background: tier.accent, boxShadow: `0 0 6px ${tier.accent}`, flexShrink: 0, display: 'inline-block' }} />
          {isSuperCoach ? `Super Coach · ${tier.label}` : tier.label}
        </div>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: 10, overflow: 'hidden',
        }}>
          <div style={{ background: '#0d1118', padding: '9px 10px' }}>
            <div style={{ fontSize: 8, letterSpacing: '0.16em', color: 'rgba(232,238,245,0.4)', fontWeight: 500, marginBottom: 3 }}>AVIS</div>
            <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace', color: '#e8eef5' }}>{reviewCount}</div>
          </div>
          <div style={{ background: '#0d1118', padding: '9px 10px' }}>
            <div style={{ fontSize: 8, letterSpacing: '0.16em', color: 'rgba(232,238,245,0.4)', fontWeight: 500, marginBottom: 3 }}>NOTE</div>
            <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace', color: avgRating ? '#4ade80' : 'rgba(232,238,245,0.55)' }}>
              {avgRating ? `${avgRating.toFixed(1)}★` : '—'}
            </div>
          </div>
          <div style={{ background: '#0d1118', padding: '9px 10px' }}>
            <div style={{ fontSize: 8, letterSpacing: '0.16em', color: 'rgba(232,238,245,0.4)', fontWeight: 500, marginBottom: 3 }}>ANS</div>
            <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace', color: '#e8eef5' }}>
              {yearsOnPlatform !== null ? (yearsOnPlatform || '<1') : '—'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Video Comments ────────────────────────────────────────────────────────── */
function VideoComments({ formationId, coachId }: { formationId: string; coachId: string }) {
  const supabase = useMemo(() => createClient(), [])
  const { user } = useUser()
  const [comments, setComments]   = useState<any[]>([])
  const [text, setText]           = useState('')
  const [sending, setSending]     = useState(false)

  const load = async () => {
    const { data } = await supabase
      .from('video_comments')
      .select('*, student:profiles!student_id(username)')
      .eq('formation_id', formationId)
      .order('created_at', { ascending: false })
    setComments(data ?? [])
  }

  useEffect(() => { load() }, [formationId])

  const submit = async () => {
    if (!text.trim() || !user) return
    setSending(true)
    await supabase.from('video_comments').insert({
      formation_id: formationId,
      coach_id:     coachId,
      student_id:   user.id,
      content:      text.trim(),
    })
    setText('')
    await load()
    setSending(false)
  }

  return (
    <div style={{ marginTop: 48 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: CREAM, letterSpacing: '-0.3px', marginBottom: 24 }}>Commentaires</h2>

      {/* Formulaire */}
      {user && (
        <div style={{ marginBottom: 32 }}>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Laisse un commentaire…"
            rows={3}
            style={{
              width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12, padding: '14px 16px', color: CREAM, fontSize: 14, lineHeight: 1.6,
              resize: 'vertical', outline: 'none', boxSizing: 'border-box',
            }}
          />
          <button
            onClick={submit}
            disabled={!text.trim() || sending}
            style={{
              marginTop: 8, padding: '9px 20px', borderRadius: 10, border: 'none',
              background: text.trim() ? '#06b6d4' : 'rgba(255,255,255,0.06)',
              color: text.trim() ? '#fff' : SILVER,
              fontSize: 13, fontWeight: 600, cursor: text.trim() ? 'pointer' : 'default', transition: 'all 0.15s',
            }}
          >
            {sending ? 'Envoi…' : 'Commenter'}
          </button>
        </div>
      )}

      {/* Liste */}
      {comments.length === 0 ? (
        <p style={{ color: SILVER, fontSize: 13 }}>Pas encore de commentaires — sois le premier !</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {comments.map((c, i) => (
            <div key={i} style={{ display: 'flex', gap: 14, padding: '20px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(6,182,212,0.2)', border: '1px solid rgba(6,182,212,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: CREAM, flexShrink: 0 }}>
                {(c.student?.username ?? '?')[0].toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: CREAM }}>{c.student?.username ?? 'Élève'}</span>
                  <span style={{ fontSize: 11, color: SILVER }}>
                    {Math.floor((Date.now() - new Date(c.created_at).getTime()) / 86400000) === 0
                      ? "aujourd'hui"
                      : `il y a ${Math.floor((Date.now() - new Date(c.created_at).getTime()) / 86400000)}j`}
                  </span>
                </div>
                <p style={{ fontSize: 14, color: 'rgba(240,244,255,0.6)', lineHeight: 1.7, margin: 0 }}>{c.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function FormationSalesPage() {
  const { id }   = useParams()
  const router   = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const { user } = useUser()

  /* state */
  const [formation, setFormation]       = useState<any>(null)
  const [chapters,  setChapters]        = useState<any[]>([])
  const [hasPurchased, setHasPurchased] = useState(false)
  const [reviews, setReviews]           = useState<any[]>([])
  const [openChapters, setOpenChapters] = useState<string[]>([])
  const [loading, setLoading]           = useState(true)
  const [selectedPack, setSelectedPack] = useState(0)

  /* review modal */
  const [showModal, setShowModal]         = useState(false)
  const [reviewRatings, setReviewRatings] = useState<Record<string, number>>({})
  const [reviewComment, setReviewComment] = useState('')
  const [submitting, setSubmitting]       = useState(false)
  const [userHasReview, setUserHasReview] = useState(false)
  const [reviewError, setReviewError]     = useState<string | null>(null)

  /* payment */
  const [paying, setPaying] = useState(false)

  /* header */
  const [isScrolled, setIsScrolled]             = useState(false)
  const [showMenu, setShowMenu]                 = useState(false)
  const [headerTab, setHeaderTab]               = useState<'formations'|'videos'|'coaching'>('formations')
  const [activeField, setActiveField]           = useState<string|null>(null)
  const [headerFilters, setHeaderFilters]       = useState<Record<string,string>>({})
  const [isSearchOverlayOpen, setIsSearchOverlayOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const ctaRef    = useRef<HTMLDivElement>(null)
  const [ctaVisible, setCtaVisible] = useState(true)

  /* video preview */
  const [showDescModal,  setShowDescModal]  = useState(false)
  const [proofs,         setProofs]         = useState<Proof[]>([])
  const [coCoaches,      setCoCoaches]      = useState<any[]>([])
  const [showProofModal, setShowProofModal] = useState(false)
  const [previewEnded, setPreviewEnded] = useState(false)

  /* lesson player */
  const [playingLesson, setPlayingLesson] = useState<{ url: string; type: string; title: string } | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPlayingLesson(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    const onScroll = () => {
      setIsScrolled(window.scrollY > 10)
      if (window.scrollY <= 10) setIsSearchOverlayOpen(false)
    }
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setActiveField(null)
        setIsSearchOverlayOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (!ctaRef.current) return
    const obs = new IntersectionObserver(([e]) => setCtaVisible(e.isIntersecting), { threshold: 0.1 })
    obs.observe(ctaRef.current)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    if (formation?.content_type) {
      const ct = formation.content_type
      setHeaderTab(ct === 'video' ? 'videos' : ct === 'coaching' ? 'coaching' : 'formations')
    }
  }, [formation])

  /* ─── load ─────────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!id) return
    const load = async () => {
      const { data: f, error } = await supabase
        .from('formations')
        .select('*, coach:profiles(id, username, bio, created_at)')
        .eq('id', id)
        .single()
      if (error) console.error('formations:', error.message)
      setFormation(f)

      if (f?.content_type === 'formation') {
        const { data: ch } = await supabase
          .from('formation_chapters')
          .select('*, formation_lessons(*)')
          .eq('formation_id', id)
          .order('order_index')
        setChapters(ch ?? [])
        if (ch?.[0]) setOpenChapters([ch[0].id])
      }

      if (f?.coach?.id) {
        const { data: pr } = await supabase
          .from('coach_proofs')
          .select('*')
          .eq('coach_id', f.coach.id)
          .order('order_index')
        setProofs(pr ?? [])

        const { data: r, error: rErr } = await supabase
          .from('reviews')
          .select('*, student:profiles!student_id(username, created_at)')
          .eq('coach_id', f.coach.id)
          .order('created_at', { ascending: false })
          .limit(20)
        if (rErr) console.error('[reviews select]', rErr.message)
        setReviews(r ?? [])
        if (user) setUserHasReview((r ?? []).some((rv: any) => rv.student_id === user.id))

        if ((f?.co_coach_ids as string[] | undefined)?.length) {
          const { data: ccData } = await supabase
            .from('profiles').select('id, username').in('id', f.co_coach_ids)
          setCoCoaches(ccData ?? [])
        }
      }

      if (user) {
        const { data: purchase } = await supabase
          .from('formation_purchases')
          .select('id')
          .eq('formation_id', id)
          .eq('user_id', user.id)
          .single()
        setHasPurchased(!!purchase || f?.price === 0)
      } else {
        setHasPurchased(f?.price === 0)
      }

      setLoading(false)
    }
    load()
  }, [id, user, supabase])

  /* ─── submit review ────────────────────────────────────────────────────── */
  const submitReview = async () => {
    if (!user) { setReviewError('Vous devez être connecté pour laisser un avis.'); return }
    if (!formation?.coach?.id) { setReviewError('Coach introuvable.'); return }
    const rated = Object.values(reviewRatings)
    if (rated.length < REVIEW_CATEGORIES.length) return
    setSubmitting(true)
    setReviewError(null)
    const overall = Math.round(rated.reduce((a, b) => a + b, 0) / rated.length)
    const { error } = await supabase.from('reviews').insert({
      coach_id:         formation.coach.id,
      student_id:       user.id,
      rating:           overall,
      comment:          reviewComment.trim() || null,
      category_ratings: reviewRatings,
      content_type:     contentType,
    })
    if (error) {
      console.error('[review insert]', error.code, error.message, error.details, error.hint)
      setReviewError(`Erreur : ${error.message}`)
      setSubmitting(false)
      return
    }
    const { data: r, error: rErr } = await supabase
      .from('reviews')
      .select('*, student:profiles!student_id(username, created_at)')
      .eq('coach_id', formation.coach.id)
      .order('created_at', { ascending: false })
      .limit(20)
    if (rErr) console.error('[reviews post-submit]', rErr.message)
    setReviews(r ?? [])
    setUserHasReview(true)
    setSubmitting(false)
    setShowModal(false)
    setReviewRatings({})
    setReviewComment('')
  }

  /* ─── guards ───────────────────────────────────────────────────────────── */
  if (loading) return <FourAcesLoader />
  if (!formation) return (
    <div style={{ minHeight: '100vh', background: '#07090e', display: 'flex', alignItems: 'center', justifyContent: 'center', color: SILVER }}>
      Formation introuvable
    </div>
  )

  /* ─── computed values ──────────────────────────────────────────────────── */
  const contentType  = formation.content_type ?? 'formation'
  const typeColor    = TYPE_COLORS[contentType] ?? '#7c3aed'
  const variantColor = VARIANT_COLORS[formation.variant ?? ''] ?? typeColor
  const allLessons   = chapters.flatMap(c => c.formation_lessons ?? [])
  const freeLessons  = allLessons.filter((l: any) => l.is_free).length
  const packs        = formation.coaching_packs ?? []
  const currentPack  = packs[selectedPack]
  const coach        = formation.coach

  const headerAccentColor = HEADER_TAB_COLORS[headerTab]
  const headerFields      = HEADER_FIELDS[headerTab]
  const showBigSearch     = !isScrolled || isSearchOverlayOpen
  const setHeaderFilter   = (key: string, val: string) => {
    setHeaderFilters(prev => ({ ...prev, [key]: prev[key] === val ? '' : val }))
    setActiveField(null)
  }
  const handleHeaderTab = (t: 'formations'|'videos'|'coaching') => {
    setHeaderTab(t)
    setHeaderFilters({})
    setIsSearchOverlayOpen(false)
    router.push('/formations')
  }

  const avgRating = reviews.length > 0
    ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length
    : null

  const uniqueStudentCount = new Set(reviews.map((r: any) => r.student_id)).size
  const isSuperCoach = uniqueStudentCount >= 50 && avgRating !== null && avgRating >= 4.5

  /* distribution 5→1 for bar chart */
  const distribution = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: reviews.filter(r => Math.round(r.rating) === star).length,
    pct: reviews.length > 0
      ? (reviews.filter(r => Math.round(r.rating) === star).length / reviews.length) * 100
      : 0,
  }))

  /* category averages */
  const categoryAvgs = REVIEW_CATEGORIES.map(cat => {
    const withCat = reviews.filter(r => r.category_ratings?.[cat.key])
    const avg = withCat.length > 0
      ? withCat.reduce((a, r) => a + r.category_ratings[cat.key], 0) / withCat.length
      : avgRating ?? 0
    return { ...cat, avg }
  })

  /* CTA */
  const ctaLabel = hasPurchased
    ? contentType === 'coaching' ? 'Gérer mes réservations →' : 'Continuer →'
    : formation.price === 0 ? 'Accéder gratuitement'
    : contentType === 'coaching' ? `Réserver — ${currentPack?.price ?? formation.price}€`
    : `Acheter — ${formation.price}€`

  const handleCTA = async () => {
    /* already owns it — just navigate */
    if (hasPurchased || formation.price === 0) {
      if (contentType === 'coaching') {
        document.getElementById('cal-section')?.scrollIntoView({ behavior: 'smooth' })
      } else {
        router.push(`/formations/${id}/learn`)
      }
      return
    }

    /* must be logged in to pay */
    if (!user) { router.push('/login'); return }

    setPaying(true)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formation_id: id,
          pack_index: contentType === 'coaching' ? selectedPack : undefined,
        }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else console.error('[checkout]', data.error)
    } catch (err) {
      console.error('[checkout]', err)
    } finally {
      setPaying(false)
    }
  }

  /* video on sales page */
  const showVideoOnPage = contentType === 'video' && formation.video_url
  const videoType = formation.video_url?.includes('vimeo') ? 'vimeo' : 'youtube'
  const canWatchFull = hasPurchased || formation.price === 0

  return (
    <div style={{ minHeight: '100vh', background: '#07090e', color: CREAM,
      paddingTop: showBigSearch ? 200 : 80, transition: 'padding-top 0.4s cubic-bezier(0.4,0,0.2,1)' }}>

      {/* Glow */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: `radial-gradient(ellipse 70% 35% at 50% 0%, ${typeColor}18 0%, transparent 65%)` }} />

      {/* ══ HEADER ══ */}
      {isScrolled && isSearchOverlayOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', animation: 'fadeIn 0.3s ease' }} />
      )}

      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: isScrolled ? 'rgba(7,9,14,0.97)' : 'transparent',
        backdropFilter: isScrolled ? 'blur(20px)' : 'none',
        borderBottom: isScrolled ? '1px solid rgba(232,228,220,0.07)' : 'none',
        transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', height: 80, padding: '0 40px', gap: 24 }}>

          {/* Logo */}
          <Link href="/formations" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <div style={{ width: 7, height: 7, borderRadius: 2, background: 'linear-gradient(135deg, #7c3aed, #06b6d4)', flexShrink: 0 }} />
            <span style={{ fontFamily: 'var(--font-syne, sans-serif)', fontWeight: 700, fontSize: 14, letterSpacing: '0.18em', color: CREAM }}>ONLYPOK</span>
          </Link>

          {/* Centre : tabs ↔ pilule compacte */}
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center', position: 'relative', height: 48, alignItems: 'center' }}>

            {/* Tabs (visibles quand non scrollé) */}
            <div style={{
              position: 'absolute',
              display: 'inline-flex', background: 'rgba(232,228,220,0.04)', border: '1px solid rgba(232,228,220,0.08)',
              borderRadius: 14, padding: 4, gap: 4,
              transition: 'all 0.4s cubic-bezier(0.4,0,0.2,1)',
              opacity: showBigSearch ? 1 : 0, pointerEvents: showBigSearch ? 'auto' : 'none',
              transform: showBigSearch ? 'translateY(0) scale(1)' : 'translateY(16px) scale(0.92)', zIndex: 10,
            }}>
              {(['formations', 'videos', 'coaching'] as const).map(t => {
                const active = headerTab === t
                const labels: Record<string,string> = { formations: 'Formations', videos: 'Vidéos', coaching: 'Coaching' }
                return (
                  <button key={t} onClick={() => handleHeaderTab(t)}
                    style={{ padding: '8px 24px', borderRadius: 10, border: 'none',
                      background: active ? `${HEADER_TAB_COLORS[t]}28` : 'transparent',
                      color: active ? CREAM : SILVER,
                      fontSize: 13, fontWeight: active ? 700 : 400, cursor: 'pointer', transition: 'all 0.25s' }}>
                    {labels[t]}
                  </button>
                )
              })}
            </div>

            {/* Pilule compacte (visible quand scrollé) */}
            <div style={{
              position: 'absolute',
              transition: 'all 0.4s cubic-bezier(0.4,0,0.2,1)',
              opacity: !showBigSearch ? 1 : 0, pointerEvents: !showBigSearch ? 'auto' : 'none',
              transform: !showBigSearch ? 'translateY(0) scale(1)' : 'translateY(-16px) scale(0.92)',
            }}>
              <button onClick={() => setIsSearchOverlayOpen(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 14,
                  background: 'rgba(232,228,220,0.06)', border: '1px solid rgba(232,228,220,0.12)',
                  borderRadius: 40, padding: '6px 8px 6px 20px', cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: CREAM }}>
                  {headerFilters.variant || 'Variante'}
                </span>
                <div style={{ width: 1, height: 16, background: 'rgba(232,228,220,0.15)' }} />
                <span style={{ fontSize: 13, color: SILVER }}>Rechercher…</span>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: headerAccentColor,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: `0 0 12px ${headerAccentColor}60` }}>
                  <Search size={15} color="#fff" />
                </div>
              </button>
            </div>
          </div>

          {/* Actions droite */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>

            {/* CTA compact — visible quand la fiche prix sort du viewport */}
            {!ctaVisible && isScrolled && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '6px 6px 6px 16px', borderRadius: 40,
                background: 'rgba(232,228,220,0.06)', border: '1px solid rgba(240,244,255,0.08)',
                animation: 'fadeIn 0.2s ease',
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: CREAM, lineHeight: 1 }}>
                    {formation.price === 0 ? 'Gratuit'
                      : contentType === 'coaching' ? `${currentPack?.price ?? formation.price}€`
                      : `${formation.price}€`}
                  </div>
                  {avgRating !== null && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
                      <Star size={10} color="#a855f7" fill="#a855f7" />
                      <span style={{ fontSize: 10, color: SILVER }}>{avgRating.toFixed(2)} · {reviews.length} avis</span>
                    </div>
                  )}
                </div>
                <button onClick={handleCTA} disabled={paying}
                  style={{ padding: '8px 18px', borderRadius: 34, border: 'none', background: typeColor, color: '#fff', fontSize: 13, fontWeight: 700, cursor: paying ? 'wait' : 'pointer', boxShadow: `0 4px 16px ${typeColor}50`, whiteSpace: 'nowrap' }}>
                  {paying ? '…' : hasPurchased ? 'Continuer →' : ctaLabel.replace(/ —.*/, '')}
                </button>
              </div>
            )}

            <Link href="/register?role=coach"
              style={{ fontSize: 13, fontWeight: 600, color: SILVER, textDecoration: 'none',
                padding: '8px 16px', border: '1px solid rgba(240,244,255,0.08)',
                borderRadius: 10, transition: 'all 0.2s', whiteSpace: 'nowrap' }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = CREAM; (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(232,228,220,0.25)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = SILVER; (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(240,244,255,0.08)' }}>
              Devenir coach
            </Link>
            <button
              style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(232,228,220,0.03)', border: '1px solid rgba(232,228,220,0.08)', color: SILVER, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = CREAM }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = SILVER }}>
              <HelpCircle size={16} />
            </button>
            <div style={{ position: 'relative' }}>
              <button onClick={() => setShowMenu(v => !v)}
                style={{ width: 38, height: 38, borderRadius: 10,
                  background: showMenu ? 'rgba(232,228,220,0.08)' : 'rgba(232,228,220,0.03)',
                  border: '1px solid rgba(232,228,220,0.08)', color: CREAM,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <Menu size={16} />
              </button>
              {showMenu && (
                <div style={{ position: 'absolute', top: 46, right: 0, background: '#07070f', border: '1px solid rgba(240,244,255,0.08)', borderRadius: 14, padding: 6, minWidth: 200, zIndex: 200, boxShadow: '0 16px 48px rgba(0,0,0,0.6)' }}>
                  <div style={{ padding: '8px 14px 12px', borderBottom: '1px solid rgba(232,228,220,0.06)', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: CREAM, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Menu</span>
                  </div>
                  {[['Mon profil', '/student/profile'], ['Mes formations', '/formations'], ['Messages', '/student/messages'], ['Tracker', '/student/track'], ['Déconnexion', '/login']].map(([label, href]) => (
                    <Link key={label} href={href}
                      style={{ display: 'block', padding: '9px 14px', fontSize: 13, color: SILVER, textDecoration: 'none', borderRadius: 8, transition: 'all 0.15s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(232,228,220,0.05)'; (e.currentTarget as HTMLAnchorElement).style.color = CREAM }}
                      onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'; (e.currentTarget as HTMLAnchorElement).style.color = SILVER }}>
                      {label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Barre de recherche */}
        <div ref={searchRef}
          style={{ height: showBigSearch ? 110 : 0, opacity: showBigSearch ? 1 : 0,
            pointerEvents: showBigSearch ? 'auto' : 'none',
            transition: 'all 0.4s cubic-bezier(0.2,0.8,0.2,1)',
            display: 'flex', justifyContent: 'center', paddingBottom: 20,
            transform: showBigSearch ? 'translateY(0) scale(1)' : 'translateY(-24px) scale(0.97)' }}>
          <div style={{ width: '100%', maxWidth: 860, position: 'relative', padding: '0 40px' }}>
            <div style={{ display: 'flex', alignItems: 'center',
              background: 'rgba(20,23,30,0.9)', backdropFilter: 'blur(25px)',
              border: '1px solid rgba(240,244,255,0.08)', borderRadius: 50,
              padding: 8, boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>

              {headerFields.map((field, idx) => {
                const isActive = activeField === field.key
                const isLast   = idx === headerFields.length - 1
                return (
                  <div key={field.key} style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <button onClick={() => setActiveField(isActive ? null : field.key)}
                      style={{ flex: 1, textAlign: 'left', border: 'none', padding: '12px 26px', cursor: 'pointer',
                        background: isActive ? 'rgba(232,228,220,0.08)' : 'transparent',
                        borderRadius: 40, transition: 'all 0.2s', width: '100%' }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: isActive ? CREAM : SILVER,
                        textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>{field.label}</div>
                      <div style={{ fontSize: 13, color: headerFilters[field.key] ? CREAM : 'rgba(138,138,138,0.5)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        {headerFilters[field.key] || field.placeholder}
                        {headerFilters[field.key] && (
                          <span onClick={e => { e.stopPropagation(); setHeaderFilter(field.key, headerFilters[field.key]) }} style={{ color: SILVER, cursor: 'pointer' }}>
                            <X size={12} />
                          </span>
                        )}
                      </div>
                    </button>
                    {!isLast && !isActive && activeField !== headerFields[idx+1]?.key && (
                      <div style={{ width: 1, height: 22, background: 'rgba(240,244,255,0.08)', position: 'absolute', right: 0 }} />
                    )}
                    {isActive && (
                      <div style={{ position: 'absolute', top: 'calc(100% + 14px)', left: 0, right: 0,
                        background: '#07070f', border: '1px solid rgba(240,244,255,0.08)',
                        borderRadius: 20, padding: 14, zIndex: 110, boxShadow: '0 30px 60px rgba(0,0,0,0.8)',
                        animation: 'airbnbPop 0.25s ease' }}>
                        <div style={{ padding: '4px 8px 12px', borderBottom: '1px solid rgba(232,228,220,0.06)', marginBottom: 10 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: CREAM, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{field.label}</span>
                        </div>
                        {activeField === 'variant' ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {VARIANT_OPTIONS.map(v => {
                              const selected = headerFilters.variant === v.id
                              return (
                                <button key={v.id} onClick={() => setHeaderFilter('variant', v.id)}
                                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                                    borderRadius: 12, border: `1px solid ${selected ? v.color + '50' : 'rgba(232,228,220,0.05)'}`,
                                    background: selected ? `${v.color}18` : 'rgba(232,228,220,0.02)',
                                    cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s', width: '100%' }}
                                  onMouseEnter={e => { if(!selected) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(232,228,220,0.05)' }}
                                  onMouseLeave={e => { if(!selected) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(232,228,220,0.02)' }}>
                                  <div style={{ width: 36, height: 36, borderRadius: 9, background: `${v.color}30`,
                                    border: `1px solid ${v.color}50`, display: 'flex', alignItems: 'center',
                                    justifyContent: 'center', fontSize: 20, flexShrink: 0, color: v.color }}>
                                    {v.id === 'MTT' ? '♠' : v.id === 'Cash' ? '♣' : v.id === 'Expresso' ? '♥' : v.id === 'Live' ? '♦' : '♣'}
                                  </div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: CREAM }}>{v.label}</div>
                                    <div style={{ fontSize: 11, color: SILVER, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.desc}</div>
                                  </div>
                                  {selected && <Check size={15} color={v.color} style={{ flexShrink: 0 }} />}
                                </button>
                              )
                            })}
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {headerFields.find(f => f.key === activeField)?.options.map(o => {
                              const selected = headerFilters[activeField] === o
                              return (
                                <button key={o} onClick={() => setHeaderFilter(activeField, o)}
                                  style={{ padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: selected ? 600 : 400,
                                    border: 'none', background: selected ? `${headerAccentColor}20` : 'transparent',
                                    color: selected ? CREAM : SILVER, cursor: 'pointer', textAlign: 'left',
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    transition: 'all 0.2s', width: '100%' }}
                                  onMouseEnter={e => { if(!selected) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(232,228,220,0.05)' }}
                                  onMouseLeave={e => { if(!selected) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}>
                                  {o}
                                  {selected && <Check size={14} color={headerAccentColor} />}
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}

              <div style={{ paddingLeft: 8 }}>
                <button onClick={() => router.push('/formations')}
                  style={{ width: 52, height: 52, borderRadius: '50%', background: headerAccentColor,
                    border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', boxShadow: `0 6px 20px ${headerAccentColor}55`, flexShrink: 0, transition: 'box-shadow 0.3s' }}>
                  <Search size={20} color="#fff" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ══ LESSON VIDEO MODAL ══ */}
      {playingLesson && (
        <VideoStudio
          video={{ url: playingLesson.url, title: playingLesson.title }}
          onClose={() => setPlayingLesson(null)}
        />
      )}

      {/* ══ PROOF GALLERY MODAL ══ */}
      {showProofModal && (
        <ProofGalleryModal
          proofs={proofs}
          coachName={coach?.username ?? 'Coach'}
          accentColor={typeColor}
          onClose={() => setShowProofModal(false)}
        />
      )}

      {/* ══ REVIEW MODAL ══ */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(7,9,14,0.88)',
          backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 20px' }}>
          <div style={{ background: '#0f1218', border: '1px solid rgba(232,228,220,0.12)', borderRadius: 20,
            padding: '36px', maxWidth: 520, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: CREAM, letterSpacing: '-0.3px' }}>Laisser un avis</h2>
              <button onClick={() => { setShowModal(false); setReviewError(null) }}
                style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid rgba(240,244,255,0.08)',
                  background: 'transparent', color: SILVER, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <X size={15} />
              </button>
            </div>

            {/* Category ratings */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginBottom: 24 }}>
              {REVIEW_CATEGORIES.map(cat => (
                <div key={cat.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: CREAM }}>{cat.label}</div>
                    <div style={{ fontSize: 11, color: SILVER }}>{cat.desc}</div>
                  </div>
                  <StarPicker
                    value={reviewRatings[cat.key] ?? 0}
                    onChange={v => setReviewRatings(prev => ({ ...prev, [cat.key]: v }))}
                  />
                </div>
              ))}
            </div>

            {/* Comment */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: SILVER, textTransform: 'uppercase',
                letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>Commentaire (optionnel)</label>
              <textarea
                value={reviewComment}
                onChange={e => setReviewComment(e.target.value)}
                placeholder="Décrivez votre expérience…"
                rows={4}
                style={{ width: '100%', background: 'rgba(232,228,220,0.04)', border: '1px solid rgba(240,244,255,0.08)',
                  borderRadius: 10, padding: '12px 14px', color: CREAM, fontSize: 13, outline: 'none',
                  fontFamily: 'inherit', resize: 'vertical', lineHeight: 1.6 }}
              />
            </div>

            {/* Error */}
            {reviewError && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 10, padding: '10px 14px', marginBottom: 14,
                fontSize: 12, color: '#fca5a5', lineHeight: 1.5 }}>
                {reviewError}
              </div>
            )}

            {/* Submit */}
            <button
              disabled={submitting || Object.keys(reviewRatings).length < REVIEW_CATEGORIES.length}
              onClick={submitReview}
              style={{ width: '100%', padding: '13px', borderRadius: 10, border: 'none',
                background: Object.keys(reviewRatings).length < REVIEW_CATEGORIES.length ? 'rgba(232,228,220,0.08)' : typeColor,
                color: Object.keys(reviewRatings).length < REVIEW_CATEGORIES.length ? SILVER : '#fff',
                fontSize: 14, fontWeight: 700, cursor: submitting ? 'wait' : 'pointer', transition: 'all 0.2s' }}>
              {submitting ? 'Envoi…' : 'Publier mon avis'}
            </button>
            {Object.keys(reviewRatings).length < REVIEW_CATEGORIES.length && (
              <p style={{ fontSize: 11, color: SILVER, textAlign: 'center', marginTop: 10 }}>
                Notez toutes les catégories pour continuer
              </p>
            )}
          </div>
        </div>
      )}

      {/* ══ HERO ══ */}
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto', padding: '28px 40px 0' }}>

        {/* Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
          <span style={{ fontSize: 10, fontWeight: 800, color: '#fff',
            background: `${typeColor}22`, backdropFilter: 'blur(8px)',
            border: `1px solid ${typeColor}70`, padding: '3px 9px', borderRadius: 99,
            letterSpacing: '0.05em', textShadow: `0 0 8px ${typeColor}` }}>
            {TYPE_LABELS[contentType]}
          </span>
          {formation.variant && (
            <span style={{ fontSize: 10, fontWeight: 800, color: '#fff',
              background: `${variantColor}22`, backdropFilter: 'blur(8px)',
              border: `1px solid ${variantColor}70`, padding: '3px 9px', borderRadius: 99,
              letterSpacing: '0.05em', textShadow: `0 0 8px ${variantColor}` }}>
              {formation.variant}
            </span>
          )}
          {formation.level && (
            <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.65)',
              background: 'rgba(232,228,220,0.06)', backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.18)', padding: '3px 9px', borderRadius: 99,
              letterSpacing: '0.05em' }}>
              {formation.level}
            </span>
          )}
        </div>

        {/* ── Image grid Airbnb style ── */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1.25fr 1fr',
          gap: 8, borderRadius: 20, overflow: 'hidden',
        }}>
          {/* Miniature principale */}
          {(() => {
            const crop = formation.thumbnail_crop
            const bgSize = 'cover'
            const bgPos  = crop ? `${crop.x ?? 50}% ${crop.y ?? 50}%` : 'center'
            return (
              <div style={{
                position: 'relative', overflow: 'hidden',
                aspectRatio: '16/9',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                ...(formation.thumbnail_url ? {
                  backgroundImage: `url(${formation.thumbnail_url})`,
                  backgroundSize: bgSize,
                  backgroundPosition: bgPos,
                  backgroundRepeat: 'no-repeat',
                } : {
                  background: `linear-gradient(135deg, ${typeColor}22 0%, ${typeColor}06 100%)`,
                }),
              }}>
                {!formation.thumbnail_url && (
                  <span style={{ fontSize: 72, opacity: 0.1, userSelect: 'none' }}>♠</span>
                )}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, zIndex: 1,
                  background: `linear-gradient(to right, ${typeColor}, ${typeColor}60)` }} />
              </div>
            )
          })()}

          {/* 2 × 2 preuves coach */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 8, position: 'relative' }}>
            {([0,1,2,3] as const).map(i => {
              const proof = proofs[i]
              return proof ? (
                <div key={proof.id}
                  onClick={() => setShowProofModal(true)}
                  style={{ position: 'relative', overflow: 'hidden', cursor: 'pointer', background: '#0f1218' }}>
                  <img src={proof.url} alt={proof.caption ?? ''}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.3s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLImageElement).style.transform = 'scale(1.04)'}
                    onMouseLeave={e => (e.currentTarget as HTMLImageElement).style.transform = 'scale(1)'} />
                  {/* badge catégorie */}
                  <div style={{ position: 'absolute', bottom: 7, left: 7 }}>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 99,
                      background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
                      color: 'rgba(232,228,220,0.75)', letterSpacing: '0.05em', textTransform: 'uppercase' as const }}>
                      {proof.category === 'sharkscope' ? 'SharkScope'
                        : proof.category === 'classement' ? 'Classement'
                        : proof.category === 'tournoi' ? 'Tournoi'
                        : proof.category === 'resultats' ? 'Résultats'
                        : 'Preuve'}
                    </span>
                  </div>
                  {/* "Voir tout" sur la 4e cellule */}
                  {i === 3 && proofs.length > 4 && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>+{proofs.length - 4} photos</span>
                    </div>
                  )}
                </div>
              ) : (
                <div key={i} style={{
                  background: 'rgba(232,228,220,0.02)',
                  border: '1px dashed rgba(232,228,220,0.08)',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                  <span style={{ fontSize: 22, opacity: 0.06 }}>♠</span>
                  <span style={{ fontSize: 9, color: 'rgba(232,228,220,0.15)',
                    letterSpacing: '0.08em', textTransform: 'uppercase' as const, fontWeight: 600 }}>
                    {(['SharkScope','Classement','Tournoi','Résultats'] as const)[i]}
                  </span>
                </div>
              )
            })}
            {/* Bouton "Afficher toutes les photos" — toujours visible, style Airbnb */}
            <button onClick={() => setShowProofModal(true)}
              style={{
                position: 'absolute', bottom: 14, right: 14, zIndex: 5,
                display: 'flex', alignItems: 'center', gap: 7,
                background: 'rgba(232,228,220,0.92)', backdropFilter: 'blur(8px)',
                border: '1px solid rgba(232,228,220,0.3)', borderRadius: 8,
                padding: '7px 14px', fontSize: 12, fontWeight: 700, color: '#07090e',
                cursor: 'pointer', transition: 'all 0.15s',
                boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
              }}
              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = '#fff'}
              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(232,228,220,0.92)'}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <rect x="1" y="1" width="5" height="5" rx="1" fill="currentColor"/>
                <rect x="10" y="1" width="5" height="5" rx="1" fill="currentColor"/>
                <rect x="1" y="10" width="5" height="5" rx="1" fill="currentColor"/>
                <rect x="10" y="10" width="5" height="5" rx="1" fill="currentColor"/>
              </svg>
              Afficher toutes les photos
            </button>
          </div>
        </div>

        {/* Titre + meta sous l'image */}
        <div style={{ marginTop: 24, marginBottom: 40 }}>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: CREAM, letterSpacing: '-0.7px',
            lineHeight: 1.2, marginBottom: 10 }}>
            {formation.title}
          </h1>
          {formation.short_desc && (
            <p style={{ fontSize: 14, color: 'rgba(232,228,220,0.5)', lineHeight: 1.65, marginBottom: 14, maxWidth: 700 }}>
              {formation.short_desc}
            </p>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            {avgRating !== null && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Star size={13} color="#a855f7" fill="#a855f7" />
                <span style={{ fontSize: 13, fontWeight: 700, color: CREAM }}>{avgRating.toFixed(2)}</span>
                <span style={{ fontSize: 12, color: SILVER }}>({reviews.length} avis)</span>
              </div>
            )}
            {coach?.username && (
              <Link href={`/coaches/${coach.id}`}
                style={{ fontSize: 13, color: SILVER, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 7 }}
                onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.color = CREAM}
                onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.color = SILVER}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: typeColor,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#fff' }}>
                  {(coach.username ?? 'C')[0].toUpperCase()}
                </div>
                {coach.username}
              </Link>
            )}
            {contentType === 'formation' && allLessons.length > 0 && (
              <span style={{ fontSize: 13, color: SILVER, display: 'flex', alignItems: 'center', gap: 5 }}>
                <BookOpen size={13} />{allLessons.length} leçons · {chapters.length} chapitres
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ══ BODY ══ */}
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto',
        padding: '0 40px 100px', display: 'grid', gridTemplateColumns: '1fr 360px',
        gap: 64, alignItems: 'start' }}>

        {/* ── Colonne gauche ── */}
        <div>

          {/* ── VIDEO PLAYER (content_type === video) ── */}
          {showVideoOnPage && (
            <div style={{ marginBottom: 32 }}>
              {canWatchFull ? (
                <>
                  <VideoPlayer url={formation.video_url} type={videoType} />
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
                <VideoPreview url={formation.video_url} type={videoType} color={typeColor} onEnded={() => setPreviewEnded(true)} />
              ) : (
                <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', aspectRatio: '16/9' }}>
                  {formation.thumbnail_url
                    ? <img src={formation.thumbnail_url} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(8px) brightness(0.35)', transform: 'scale(1.05)' }} />
                    : <div style={{ position: 'absolute', inset: 0, background: '#0d1017' }} />}
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24, textAlign: 'center' }}>
                    <Lock size={20} color={SILVER} />
                    <p style={{ fontSize: 15, fontWeight: 700, color: CREAM, margin: 0 }}>Fin de la prévisualisation</p>
                    <p style={{ fontSize: 13, color: SILVER, margin: 0 }}>Achetez pour accéder au contenu complet</p>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button onClick={() => setPreviewEnded(false)} style={{ padding: '9px 18px', borderRadius: 9, border: '1px solid rgba(232,228,220,0.15)', background: 'rgba(232,228,220,0.07)', color: CREAM, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>↩ Revoir</button>
                      <button onClick={handleCTA} disabled={paying} style={{ padding: '9px 20px', borderRadius: 9, border: 'none', background: typeColor, color: '#fff', fontSize: 13, fontWeight: 700, cursor: paying ? 'wait' : 'pointer' }}>{paying ? 'Redirection…' : `Acheter — ${formation.price}€`}</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── 1. HIGHLIGHTS — choisis par le coach ── */}
          {(() => {
            const chosen: typeof HIGHLIGHTS = formation.highlights?.length
              ? HIGHLIGHTS.filter(h => (formation.highlights as string[]).includes(h.id))
              : contentType === 'coaching'
                ? HIGHLIGHTS.filter(h => ['replay','cancel','individual'].includes(h.id))
                : contentType === 'video'
                  ? HIGHLIGHTS.filter(h => ['hd','lifetime','refund'].includes(h.id))
                  : HIGHLIGHTS.filter(h => ['structured','lifetime','refund'].includes(h.id))
            return (
              <div style={{ padding: '32px 0', borderBottom: '1px solid rgba(232,228,220,0.08)', display: 'flex', flexDirection: 'column', gap: 24 }}>
                {chosen.map(h => (
                  <HighlightRow key={h.id} icon={<h.Icon size={26} />} title={h.label} desc={h.desc} />
                ))}
              </div>
            )
          })()}

          {/* ── 3. DESCRIPTION ── */}
          {formation.description && (
            <div style={{ padding: '32px 0', borderBottom: '1px solid rgba(232,228,220,0.08)' }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: CREAM, letterSpacing: '-0.3px', marginBottom: 16 }}>
                {contentType === 'coaching' ? 'À propos de ce coaching' : 'À propos de cette formation'}
              </h2>
              <p style={{
                fontSize: 15, color: 'rgba(232,228,220,0.65)', lineHeight: 1.8, whiteSpace: 'pre-line',
                display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical',
                overflow: 'hidden', margin: '0 0 4px',
              } as React.CSSProperties}>
                {formation.description}
              </p>
              <p style={{ fontSize: 15, color: 'rgba(232,228,220,0.3)', margin: '0 0 22px' }}>…</p>
              <button onClick={() => setShowDescModal(true)}
                style={{ background: 'transparent', border: '1px solid rgba(232,228,220,0.25)', borderRadius: 10, padding: '10px 22px', fontSize: 14, fontWeight: 600, color: CREAM, cursor: 'pointer', transition: 'all 0.15s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(232,228,220,0.06)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(232,228,220,0.45)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(232,228,220,0.25)' }}>
                Lire la suite
              </button>
              {showDescModal && (
                <div onClick={() => setShowDescModal(false)} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 24px' }}>
                  <div onClick={e => e.stopPropagation()} style={{ background: '#161920', borderRadius: 16, width: '100%', maxWidth: 520, maxHeight: '60vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.7)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 22px', borderBottom: '1px solid rgba(232,228,220,0.07)' }}>
                      <h3 style={{ fontSize: 16, fontWeight: 700, color: CREAM, margin: 0 }}>
                        {contentType === 'coaching' ? 'À propos de ce coaching' : 'À propos de cette formation'}
                      </h3>
                      <button onClick={() => setShowDescModal(false)} style={{ background: 'rgba(232,228,220,0.07)', border: 'none', borderRadius: '50%', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: CREAM, fontSize: 16 }}>×</button>
                    </div>
                    <div style={{ overflowY: 'auto', padding: '20px 22px' }}>
                      <p style={{ fontSize: 14, color: 'rgba(232,228,220,0.7)', lineHeight: 1.8, whiteSpace: 'pre-line', margin: 0 }}>
                        {formation.description}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── COACH ROW — après description, Airbnb host style ── */}
          {coach && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '32px 0', borderBottom: '1px solid rgba(232,228,220,0.08)' }}>
              <div>
                <h2 style={{ fontSize: 22, fontWeight: 700, color: CREAM, margin: '0 0 6px', letterSpacing: '-0.3px' }}>
                  Par {coach.username}
                </h2>
                <p style={{ fontSize: 13, color: SILVER, margin: 0, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  {avgRating !== null && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Star size={12} color="#a855f7" fill="#a855f7" />
                      <span style={{ fontWeight: 600, color: CREAM }}>{avgRating.toFixed(2)}</span>
                      <span>·</span>
                    </span>
                  )}
                  <span>{reviews.length} avis</span>
                  {contentType === 'formation' && allLessons.length > 0 && <><span>·</span><span>{allLessons.length} leçons</span></>}
                  {contentType === 'coaching' && packs.length > 0 && <><span>·</span><span>{packs.length} pack{packs.length > 1 ? 's' : ''}</span></>}
                </p>
              </div>
              <Link href={`/coaches/${coach.id}`} style={{ textDecoration: 'none' }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: `linear-gradient(135deg, ${typeColor}, ${typeColor}88)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                  {(coach.username ?? 'C')[0].toUpperCase()}
                </div>
              </Link>
            </div>
          )}

          {/* ── 4a. PROGRAMME (formation) ── */}
          {contentType === 'formation' && chapters.length > 0 && (
            <div style={{ padding: '32px 0', borderBottom: '1px solid rgba(232,228,220,0.08)' }}>
              {/* Header avec stats */}
              <div style={{ marginBottom: 24 }}>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: CREAM, letterSpacing: '-0.3px', margin: '0 0 10px' }}>Contenu de la formation</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, color: SILVER, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <BookOpen size={13} /> {chapters.length} chapitres
                  </span>
                  <span style={{ fontSize: 13, color: SILVER, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <PlayCircle size={13} /> {allLessons.length} leçons
                  </span>
                  {freeLessons > 0 && (
                    <span style={{ fontSize: 12, color: '#06b6d4', background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.25)', padding: '2px 8px', borderRadius: 99 }}>
                      {freeLessons} gratuites
                    </span>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {chapters.map((chapter, ci) => {
                  const isOpen = openChapters.includes(chapter.id)
                  const lessons = chapter.formation_lessons ?? []
                  const freeC = lessons.filter((l: any) => l.is_free).length
                  return (
                    <div key={chapter.id} style={{ background: isOpen ? 'rgba(232,228,220,0.04)' : 'rgba(232,228,220,0.02)', border: `1px solid ${isOpen ? typeColor + '30' : 'rgba(232,228,220,0.07)'}`, borderRadius: 14, overflow: 'hidden', transition: 'all 0.2s' }}>
                      <button onClick={() => setOpenChapters(prev => isOpen ? prev.filter(x => x !== chapter.id) : [...prev, chapter.id])}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                        {/* Numéro chapitre */}
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: isOpen ? typeColor : `${typeColor}20`, border: `1px solid ${typeColor}50`, color: isOpen ? '#fff' : typeColor, fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s' }}>{ci + 1}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: CREAM, display: 'block' }}>{chapter.title}</span>
                          <span style={{ fontSize: 12, color: SILVER }}>
                            {lessons.length} leçon{lessons.length > 1 ? 's' : ''}
                            {freeC > 0 && <span style={{ color: '#06b6d4', marginLeft: 6 }}>· {freeC} gratuites</span>}
                          </span>
                        </div>
                        <span style={{ color: isOpen ? typeColor : SILVER, flexShrink: 0, transition: 'color 0.2s' }}>
                          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </span>
                      </button>
                      {isOpen && (
                        <div style={{ borderTop: `1px solid ${typeColor}20` }}>
                          {lessons.map((lesson: any) => {
                            const locked = !lesson.is_free && !hasPurchased
                            const canPlay = (lesson.is_free || hasPurchased) && !!lesson.video_url
                            const ytId = lesson.video_url ? getYtId(lesson.video_url) : null
                            const thumbUrl = ytId ? `https://img.youtube.com/vi/${ytId}/mqdefault.jpg` : null
                            return (
                              <div key={lesson.id}
                                onClick={canPlay ? () => setPlayingLesson({ url: lesson.video_url, type: lesson.video_type ?? 'youtube', title: lesson.title }) : undefined}
                                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 18px', borderBottom: '1px solid rgba(232,228,220,0.04)', cursor: canPlay ? 'pointer' : 'default', transition: 'background 0.15s' }}
                                onMouseEnter={e => { if (canPlay) (e.currentTarget as HTMLDivElement).style.background = 'rgba(232,228,220,0.04)' }}
                                onMouseLeave={e => { if (canPlay) (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}>
                                {/* Miniature */}
                                <div style={{ width: 64, height: 44, borderRadius: 6, overflow: 'hidden', flexShrink: 0, position: 'relative', background: `${typeColor}15` }}>
                                  {thumbUrl ? (
                                    <img src={thumbUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                  ) : (
                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                      <PlayCircle size={16} color={typeColor} style={{ opacity: 0.4 }} />
                                    </div>
                                  )}
                                  {locked && (
                                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                      <Lock size={11} color={SILVER} />
                                    </div>
                                  )}
                                  {canPlay && !locked && (
                                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s' }}
                                      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'rgba(0,0,0,0.35)'}
                                      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'rgba(0,0,0,0)'}>
                                    </div>
                                  )}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <span style={{ fontSize: 13, color: locked ? SILVER : CREAM, display: 'block', opacity: locked ? 0.6 : 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lesson.title}</span>
                                </div>
                                {lesson.is_free && !hasPurchased && (
                                  <span style={{ fontSize: 10, color: '#06b6d4', border: '1px solid rgba(6,182,212,0.3)', padding: '2px 8px', borderRadius: 99, flexShrink: 0, fontWeight: 600 }}>Gratuit</span>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── 4b. PACKS (coaching) ── */}
          {contentType === 'coaching' && packs.length > 0 && (
            <div style={{ padding: '32px 0', borderBottom: '1px solid rgba(232,228,220,0.08)' }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: CREAM, letterSpacing: '-0.3px', marginBottom: 20 }}>Packs disponibles</h2>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(packs.length, 3)}, 1fr)`, gap: 12 }}>
                {packs.map((pack: any, i: number) => (
                  <div key={i} onClick={() => setSelectedPack(i)}
                    style={{ background: selectedPack === i ? `${typeColor}12` : 'rgba(232,228,220,0.03)', border: `1px solid ${selectedPack === i ? typeColor + '50' : 'rgba(232,228,220,0.08)'}`, borderRadius: 14, padding: '20px', cursor: 'pointer', transition: 'all 0.2s' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: CREAM }}>{pack.label}</span>
                      {selectedPack === i && <Check size={14} color={typeColor} />}
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: selectedPack === i ? typeColor : CREAM, marginBottom: 4 }}>{pack.price}€</div>
                    <div style={{ fontSize: 11, color: SILVER, marginBottom: 8 }}>{pack.hours}h · {pack.hours > 0 && pack.price > 0 ? Math.round(pack.price / pack.hours) + '€/h' : ''}</div>
                    {pack.desc && <p style={{ fontSize: 12, color: SILVER, lineHeight: 1.5, margin: 0 }}>{pack.desc}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── 4c. CAL.COM (coaching) ── */}
          {contentType === 'coaching' && formation.cal_url && (
            <div id="cal-section" style={{ padding: '32px 0', borderBottom: '1px solid rgba(232,228,220,0.08)' }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: CREAM, letterSpacing: '-0.3px', marginBottom: 6 }}>Réserver une session</h2>
              <p style={{ fontSize: 13, color: SILVER, marginBottom: 20 }}>Choisissez un créneau et réservez directement</p>
              <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(240,244,255,0.08)', height: 600 }}>
                <iframe src={formation.cal_url} style={{ width: '100%', height: '100%', border: 'none', background: '#fff' }} title="Cal.com" />
              </div>
            </div>
          )}

        </div>

        {/* ── Colonne droite sticky ── */}
        <div ref={ctaRef} style={{ position: 'sticky', top: 100 }}>
          <div style={{ background: '#0f1218', border: '1px solid rgba(240,244,255,0.08)', borderRadius: 20, overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>
            {formation.thumbnail_url && (
              <div style={{ height: 175, backgroundImage: `url(${formation.thumbnail_url})`, backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' }}>
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, #0f1218 100%)' }} />
                <div style={{ position: 'absolute', top: 10, left: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 99, background: `${typeColor}30`, border: `1px solid ${typeColor}60`, color: typeColor }}>
                    {TYPE_LABELS[contentType]}
                  </span>
                </div>
              </div>
            )}
            <div style={{ padding: '22px' }}>
              {contentType === 'coaching' && packs.length > 0 && (
                <>
                  <div style={{ display: 'flex', gap: 0, marginBottom: 18, background: 'rgba(232,228,220,0.04)', borderRadius: 10, padding: 3 }}>
                    {packs.map((pack: any, i: number) => (
                      <button key={i} onClick={() => setSelectedPack(i)}
                        style={{ flex: 1, padding: '7px 4px', border: 'none', borderRadius: 8, background: selectedPack === i ? typeColor : 'transparent', color: selectedPack === i ? '#fff' : SILVER, fontSize: 11, fontWeight: selectedPack === i ? 700 : 400, cursor: 'pointer', transition: 'all 0.2s' }}>
                        {pack.label}
                      </button>
                    ))}
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 2 }}>
                      <span style={{ fontSize: 30, fontWeight: 800, color: CREAM }}>{currentPack?.price}€</span>
                      <span style={{ fontSize: 13, color: SILVER }}>/ {currentPack?.hours}h</span>
                    </div>
                    {currentPack?.hours > 0 && <p style={{ fontSize: 12, color: SILVER, margin: 0 }}>soit {Math.round(currentPack.price / currentPack.hours)}€/h</p>}
                  </div>
                </>
              )}
              {contentType !== 'coaching' && (
                <div style={{ marginBottom: 18 }}>
                  <div style={{ fontSize: 34, fontWeight: 800, color: formation.price === 0 ? '#06b6d4' : CREAM, marginBottom: 4 }}>
                    {formation.price === 0 ? 'Gratuit' : `${formation.price}€`}
                  </div>
                  {hasPurchased && formation.price > 0 && (
                    <span style={{ fontSize: 12, color: '#06b6d4', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <CheckCircle size={12} /> Déjà acheté
                    </span>
                  )}
                </div>
              )}
              <button onClick={handleCTA} disabled={paying}
                style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: hasPurchased ? 'rgba(6,182,212,0.15)' : typeColor, color: hasPurchased ? '#06b6d4' : '#fff', fontSize: 14, fontWeight: 800, cursor: paying ? 'wait' : 'pointer', opacity: paying ? 0.7 : 1, boxShadow: hasPurchased ? 'none' : `0 4px 24px ${typeColor}50`, transition: 'opacity 0.2s', marginBottom: 18 }}
                onMouseEnter={e => { if (!paying) (e.currentTarget as HTMLButtonElement).style.opacity = '0.85' }}
                onMouseLeave={e => { if (!paying) (e.currentTarget as HTMLButtonElement).style.opacity = '1' }}>
                {paying ? 'Redirection vers le paiement…' : ctaLabel}
              </button>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 16, borderTop: '1px solid rgba(232,228,220,0.07)' }}>
                {contentType === 'formation' && (
                  <>
                    {allLessons.length > 0 && <Feature icon={<BookOpen size={13} />} label={`${allLessons.length} leçons · ${chapters.length} chapitres`} />}
                    {freeLessons > 0 && <Feature icon={<PlayCircle size={13} />} label={`${freeLessons} leçons gratuites`} color="#06b6d4" />}
                    <Feature icon={<Clock size={13} />} label="Accès à vie" />
                    <Feature icon={<Zap size={13} />} label="Mises à jour incluses" />
                  </>
                )}
                {contentType === 'video' && (
                  <>
                    <Feature icon={<PlayCircle size={13} />} label="Vidéo HD" />
                    <Feature icon={<Clock size={13} />} label="Accès à vie" />
                    <Feature icon={<MessageSquare size={13} />} label="Commentaires" />
                  </>
                )}
                {contentType === 'coaching' && currentPack && (
                  <>
                    <Feature icon={<Clock size={13} />} label={`${currentPack.hours}h de coaching`} />
                    <Feature icon={<PlayCircle size={13} />} label="Replay des sessions" />
                    <Feature icon={<Shield size={13} />} label="Annulation gratuite 24h avant" />
                  </>
                )}
                <Feature icon={<Shield size={13} />} label="Paiement sécurisé" />
              </div>

              {!hasPurchased && formation.price > 0 && contentType !== 'coaching' && (
                <p style={{ fontSize: 11, color: 'rgba(138,138,138,0.35)', textAlign: 'center', marginTop: 14 }}>
                  Satisfait ou remboursé 7 jours
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ══ REVIEWS — pleine largeur centrée (Image #28) ══ */}
      <div id="comments-section" style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto', padding: '0 40px 100px' }}>
        <div style={{ borderTop: '1px solid rgba(232,228,220,0.08)', paddingTop: 56 }}>

          {/* En-tête avis */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 48 }}>
            <h2 style={{ fontSize: 26, fontWeight: 800, color: CREAM, letterSpacing: '-0.5px', margin: 0 }}>
              {reviews.length === 0 ? 'Avis' : `${reviews.length} avis`}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {hasPurchased && !userHasReview && (
                <button onClick={() => setShowModal(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 10, border: `1px solid ${typeColor}40`, background: `${typeColor}12`, color: typeColor, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  <Star size={13} /> Laisser un avis
                </button>
              )}
              {userHasReview && (
                <span style={{ fontSize: 12, color: '#06b6d4', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <CheckCircle size={13} /> Avis publié
                </span>
              )}
            </div>
          </div>

          {reviews.length === 0 ? (
            <div style={{ background: 'rgba(232,228,220,0.02)', border: '1px solid rgba(232,228,220,0.07)', borderRadius: 14, padding: '64px', textAlign: 'center' }}>
              <p style={{ color: SILVER, fontSize: 14, margin: 0 }}>Pas encore d'avis — soyez le premier !</p>
            </div>
          ) : (
            <>
              {/* Score centré + distribution + catégories (Image #28) */}
              <RatingDetailFull
                avgRating={avgRating ?? 0}
                distribution={distribution}
                categoryAvgs={categoryAvgs}
                accentColor={typeColor}
              />
              {/* Grille de cartes avis — 2 colonnes */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, marginTop: 8 }}>
                {reviews.map((r: any) => <ReviewCard key={r.id} r={r} typeColor={typeColor} />)}
              </div>
            </>
          )}

          {contentType === 'video' && canWatchFull && (
            <VideoComments formationId={formation.id} coachId={formation.coach?.id} />
          )}
        </div>
      </div>

      {/* ══ COACH PRESENTATION — Faites connaissance ══ */}
      {coach && (
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 40px 120px' }}>
          <div style={{ borderTop: '1px solid rgba(232,228,220,0.08)', paddingTop: 64 }}>
            <h2 style={{ fontSize: 26, fontWeight: 800, color: CREAM, letterSpacing: '-0.5px', margin: '0 0 40px' }}>
              Faites connaissance avec votre coach
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 72, alignItems: 'start' }}>

              {/* ── Colonne gauche : carte ── */}
              <CoachIridescentCard
                coach={coach}
                avgRating={avgRating}
                reviewCount={reviews.length}
                isSuperCoach={isSuperCoach}
                accentColor={typeColor}
              />

              {/* ── Colonne droite : infos ── */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

                {/* Super Coach */}
                {isSuperCoach && (
                  <div style={{ marginBottom: 24 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: CREAM, margin: '0 0 8px', letterSpacing: '-0.2px' }}>
                      {coach.username} est Super Coach
                    </h3>
                    <p style={{ fontSize: 14, color: SILVER, lineHeight: 1.65, margin: 0 }}>
                      Les Super Coachs sont des coaches expérimentés qui bénéficient de très bonnes évaluations et s&apos;engagent à offrir un enseignement de qualité à leurs élèves.
                    </p>
                  </div>
                )}

                {/* Co-coachs */}
                {coCoaches.length > 0 && (
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ height: 1, background: 'rgba(232,228,220,0.07)', marginBottom: 20 }} />
                    <h4 style={{ fontSize: 14, fontWeight: 700, color: CREAM, margin: '0 0 14px' }}>Co-coachs</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {coCoaches.map(cc => (
                        <div key={cc.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ width: 40, height: 40, borderRadius: '50%', background: `linear-gradient(135deg, ${typeColor}30, rgba(232,228,220,0.06))`, border: '1px solid rgba(240,244,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: CREAM, flexShrink: 0 }}>
                            {(cc.username ?? 'C')[0].toUpperCase()}
                          </div>
                          <span style={{ fontSize: 14, color: CREAM }}>{cc.username}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Infos */}
                <div style={{ marginBottom: 24 }}>
                  <div style={{ height: 1, background: 'rgba(232,228,220,0.07)', marginBottom: 20 }} />
                  <h4 style={{ fontSize: 14, fontWeight: 700, color: CREAM, margin: '0 0 12px' }}>Informations sur le coach</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {formation.variant && (
                      <p style={{ fontSize: 14, color: SILVER, margin: 0 }}>Spécialité : {formation.variant}</p>
                    )}
                    {coach.bio ? (
                      <p style={{ fontSize: 14, color: SILVER, lineHeight: 1.65, margin: 0 }}>{coach.bio}</p>
                    ) : (
                      <p style={{ fontSize: 14, color: 'rgba(138,138,138,0.4)', fontStyle: 'italic', margin: 0 }}>Ce coach n&apos;a pas encore renseigné sa bio.</p>
                    )}
                  </div>
                </div>

                {/* CTA */}
                <div style={{ height: 1, background: 'rgba(232,228,220,0.07)', marginBottom: 20 }} />
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <Link href={`/coaches/${coach.id}`} style={{ textDecoration: 'none' }}>
                    <button style={{ padding: '13px 28px', borderRadius: 10, background: 'rgba(232,228,220,0.07)', border: '1px solid rgba(232,228,220,0.12)', color: CREAM, fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'background 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(232,228,220,0.12)' )}
                      onMouseLeave={e => (e.currentTarget.style.background = 'rgba(232,228,220,0.07)')}>
                      Voir le profil complet
                    </button>
                  </Link>
                  {proofs.length > 0 && (
                    <button onClick={() => setShowProofModal(true)} style={{ padding: '13px 24px', borderRadius: 10, border: `1px solid ${typeColor}40`, background: `${typeColor}12`, color: typeColor, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                      Voir les preuves
                    </button>
                  )}
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes airbnbPop { from { opacity:0; transform:translateY(-8px) scale(0.98); } to { opacity:1; transform:translateY(0) scale(1); } }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
      `}</style>
    </div>
  )
}
