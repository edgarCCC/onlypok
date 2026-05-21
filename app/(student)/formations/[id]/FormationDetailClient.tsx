'use client'
import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import {
  ArrowLeft, Star, ChevronDown, ChevronUp, Lock, PlayCircle, CheckCircle,
  Clock, BookOpen, Zap, Shield, Check, X, Share2, MessageSquare, TrendingUp, Award,
  HelpCircle, Menu, Search, ChevronLeft, ChevronRight, Calendar, Loader2,
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
  NLH: '#7c3aed', MTT: '#7c3aed', Cash: '#06b6d4',
  Expresso: '#ef4444', Live: '#f59e0b', PLO: '#a855f7',
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
  { id: 'MTT',      label: 'MTT',        desc: 'Tournois multi-tables',    color: '#7c3aed' },
  { id: 'Cash',     label: 'Cash Game',  desc: 'Tables cash 6-max / HU',  color: '#06b6d4' },
  { id: 'Expresso', label: 'Expresso',   desc: 'Sit & Go hyper-turbo',    color: '#ef4444' },
  { id: 'Live',     label: 'Live',       desc: 'Poker en casino / cercle', color: '#f59e0b' },
  { id: 'PLO',      label: 'PLO',        desc: 'Pot-Limit Omaha',         color: '#a855f7' },
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

/* ─── calendar helpers ──────────────────────────────────────────────────────── */
const MONTH_NAMES = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
const CAL_DAYS    = ['Lu','Ma','Me','Je','Ve','Sa','Di']

function calFormatDate(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
function calIsSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}
function calGetMonthDays(year: number, month: number) {
  const firstDay    = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  return { offset: (firstDay + 6) % 7, daysInMonth }
}
function generateSlots(
  availabilities: { day_of_week: number; slot: string }[],
  bookedTimestamps: string[],
  weeksAhead = 8
): Date[] {
  const now    = new Date()
  const cutoff = new Date(now.getTime() + weeksAhead * 7 * 24 * 3600 * 1000)
  const booked = new Set(bookedTimestamps.map(t => new Date(t).toISOString()))
  const result: Date[] = []
  for (const avail of availabilities) {
    const jsDow = avail.day_of_week % 7
    const [hh, mm] = avail.slot.split(':').map(Number)
    const cur = new Date(now)
    const diff = (jsDow - cur.getDay() + 7) % 7
    cur.setDate(cur.getDate() + (diff === 0 ? 0 : diff))
    cur.setHours(hh, mm, 0, 0)
    if (cur <= now) cur.setDate(cur.getDate() + 7)
    while (cur <= cutoff) {
      if (!booked.has(cur.toISOString())) result.push(new Date(cur))
      cur.setDate(cur.getDate() + 7)
    }
  }
  result.sort((a, b) => a.getTime() - b.getTime())
  return result
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
          fontSize: 18, fontWeight: 800, color: '#fff', overflow: 'hidden',
        }}>
          {r.student?.avatar_url
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={r.student.avatar_url} alt={username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : initial}
        </div>
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
function VideoComments({ formationId, coachId, videoUrl }: { formationId: string; coachId: string; videoUrl?: string }) {
  const supabase = useMemo(() => createClient(), [])
  const { user } = useUser()
  const [comments, setComments]   = useState<any[]>([])
  const [text, setText]           = useState('')
  const [sending, setSending]     = useState(false)

  const load = async () => {
    let query = supabase
      .from('video_comments')
      .select('id, content, created_at, student_id')
      .order('created_at', { ascending: false })
    query = videoUrl ? query.eq('video_url', videoUrl) : query.eq('formation_id', formationId)
    const { data, error } = await query
    if (error || !data?.length) { setComments([]); return }
    const studentIds = [...new Set(data.map((c: any) => c.student_id).filter(Boolean))]
    const { data: profiles } = await supabase.from('profiles').select('id, username').in('id', studentIds)
    const profileMap: Record<string, string> = {}
    for (const p of profiles ?? []) profileMap[p.id] = p.username
    setComments(data.map((c: any) => ({ ...c, student: { username: profileMap[c.student_id] ?? null } })))
  }

  useEffect(() => { load() }, [formationId, videoUrl])

  const submit = async () => {
    if (!text.trim() || !user) return
    setSending(true)
    const payload: any = {
      coach_id:   coachId,
      student_id: user.id,
      content:    text.trim(),
    }
    if (videoUrl) { payload.video_url = videoUrl } else { payload.formation_id = formationId }
    await supabase.from('video_comments').insert(payload)
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
export default function FormationDetailClient({
  formationId,
  initialFormation,
  initialChapters,
  initialReviews,
  initialProofs,
  initialCoCoaches,
  initialHasPurchased,
  initialUserHasReview,
}: {
  formationId: string
  initialFormation: any
  initialChapters: any[]
  initialReviews: any[]
  initialProofs: any[]
  initialCoCoaches: any[]
  initialHasPurchased: boolean
  initialUserHasReview: boolean
}) {
  const id     = formationId
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = useMemo(() => createClient(), [])
  const { user, profile, signOut } = useUser()

  const paymentJustCompleted = searchParams.get('payment') === 'success'

  /* state — initialized from server-fetched data */
  const [formation, setFormation]       = useState<any>(initialFormation)
  const [chapters,  setChapters]        = useState<any[]>(initialChapters)
  const [hasPurchased, setHasPurchased] = useState(initialHasPurchased || paymentJustCompleted)
  const [reviews, setReviews]           = useState<any[]>(initialReviews)
  const [openChapters, setOpenChapters] = useState<string[]>(
    initialChapters.length > 0 ? [initialChapters[0].id] : []
  )
  const [loading, setLoading]           = useState(false)
  const [selectedPack, setSelectedPack] = useState(() => {
    const p = parseInt(searchParams.get('pack') ?? '0', 10)
    return isNaN(p) ? 0 : p
  })

  /* review modal */
  const [showModal, setShowModal]         = useState(false)
  const [reviewRatings, setReviewRatings] = useState<Record<string, number>>({})
  const [reviewComment, setReviewComment] = useState('')
  const [submitting, setSubmitting]       = useState(false)
  const [userHasReview, setUserHasReview] = useState(initialUserHasReview)
  const [reviewError, setReviewError]     = useState<string | null>(null)

  /* payment */
  const [paying, setPaying] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [pendingCount,        setPendingCount]        = useState(0)
  const [showCreditConfirm,   setShowCreditConfirm]   = useState(false)
  const [creditConfirmTarget, setCreditConfirmTarget] = useState<'slot'|'later'>('later')

  /* native slot picker */
  const [calSlots,    setCalSlots]    = useState<Date[]>([])
  const [calLoading,  setCalLoading]  = useState(false)
  const today = new Date()
  const [calYear,  setCalYear]  = useState(today.getFullYear())
  const [calMonth, setCalMonth] = useState(today.getMonth())
  const [calSelDay,  setCalSelDay]  = useState<Date | null>(null)
  const [calSelSlot, setCalSelSlot] = useState<Date | null>(null)

  /* header */
  const [isScrolled, setIsScrolled]             = useState(false)
  const [showMenu, setShowMenu]                 = useState(false)
  const ct0 = initialFormation?.content_type
  const [headerTab, setHeaderTab]               = useState<'formations'|'videos'|'coaching'>(
    ct0 === 'video' ? 'videos' : ct0 === 'coaching' ? 'coaching' : 'formations'
  )
  const [activeField, setActiveField]           = useState<string|null>(null)
  const [headerFilters, setHeaderFilters]       = useState<Record<string,string>>({})
  const [isSearchOverlayOpen, setIsSearchOverlayOpen] = useState(false)
  const searchRef   = useRef<HTMLDivElement>(null)
  const [slotPast, setSlotPast] = useState(false)

  /* video preview */
  const [showDescModal,  setShowDescModal]  = useState(false)
  const [proofs,         setProofs]         = useState<Proof[]>(initialProofs)
  const [coCoaches,      setCoCoaches]      = useState<any[]>(initialCoCoaches)
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
    const el = document.getElementById('slot-picker')
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => setSlotPast(!e.isIntersecting && e.boundingClientRect.top < 0),
      { threshold: 0 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  /* ─── load coach availabilities for slot picker ─────────────────────────── */
  useEffect(() => {
    const coachId = initialFormation?.coach?.id
    if (!coachId || (initialFormation?.content_type ?? 'formation') !== 'coaching') return
    setCalLoading(true)
    const load = async () => {
      const [{ data: avails }, { data: booked }] = await Promise.all([
        supabase.from('availabilities').select('day_of_week, slot').eq('coach_id', coachId).eq('booked', false),
        supabase.from('bookings').select('scheduled_at').eq('coach_id', coachId).eq('status', 'scheduled').not('scheduled_at', 'is', null),
      ])
      const bookedTs = (booked ?? []).map((b: any) => b.scheduled_at).filter(Boolean)
      setCalSlots(generateSlots(avails ?? [], bookedTs))
      setCalLoading(false)
    }
    load()
  }, [initialFormation?.coach?.id, initialFormation?.content_type, supabase])

  /* ─── pending coaching credits for this coach ─── */
  useEffect(() => {
    if (!user || (initialFormation?.content_type ?? 'formation') !== 'coaching') return
    const coachId = initialFormation?.coach?.id
    if (!coachId) return
    supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', user.id)
      .eq('coach_id', coachId)
      .eq('status', 'paid_pending_schedule')
      .then(({ count }: { count: number | null }) => setPendingCount(count ?? 0))
  }, [user, initialFormation?.coach?.id, initialFormation?.content_type, supabase])

  /* ─── update userHasReview when auth user becomes available ── */
  useEffect(() => {
    if (user && reviews.length > 0) {
      setUserHasReview(reviews.some((rv: any) => rv.student_id === user.id))
    }
  }, [user, reviews])

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
      .select('*, student:profiles!student_id(username, avatar_url, created_at)')
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

  /* Weekend pricing — detected client-side (display only; Stripe re-checks server-side) */
  const isWeekend = (() => { const d = new Date().getDay(); return d === 0 || d === 6 })()
  const weekendPct: number = coach?.weekend_rate_pct ?? 0
  const weekendMultiplier = (contentType === 'coaching' && isWeekend && weekendPct > 0) ? 1 + weekendPct / 100 : 1
  const applyWeekend = (price: number) => weekendMultiplier > 1 ? Math.round(price * weekendMultiplier) : price

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
    router.push(t === 'formations' ? '/formations' : `/formations?tab=${t}`)
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

  /* CTA — for coaching, prices live in packs, not formation.price (which is always 0) */
  const coachingPackPrice = currentPack ? Number(currentPack.price) : 0
  const isCoachingPaid = contentType === 'coaching' && packs.some((p: any) => Number(p.price) > 0)
  const effectivePrice = contentType === 'coaching'
    ? coachingPackPrice
    : Number(formation.price)

  const needsSlot = contentType === 'coaching' && !hasPurchased && isCoachingPaid
  const slotLabel = calSelSlot
    ? `${calSelSlot.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })} · ${calSelSlot.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
    : null

  const ctaLabel = hasPurchased
    ? contentType === 'coaching' ? 'Voir mes sessions →'
    : contentType === 'video'   ? 'Regarder la vidéo →'
    : 'Continuer la formation →'
    : effectivePrice === 0 ? 'Accéder gratuitement'
    : contentType === 'coaching'
      ? calSelSlot
        ? `Réserver · ${slotLabel} — ${applyWeekend(effectivePrice)}€`
        : 'Sélectionne un créneau ↓'
      : `Acheter — ${effectivePrice}€`

  const ctaDisabled = paying || (needsSlot && !calSelSlot)

  const doStripeCheckout = async (withSlot: boolean) => {
    setPaying(true)
    setCheckoutError(null)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formation_id:  id,
          pack_index:    contentType === 'coaching' ? selectedPack : undefined,
          scheduled_at:  withSlot ? (calSelSlot?.toISOString() ?? undefined) : undefined,
        }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else setCheckoutError(data.error ?? 'Une erreur est survenue. Réessaie.')
    } catch {
      setCheckoutError('Erreur réseau. Vérifie ta connexion et réessaie.')
    } finally {
      setPaying(false)
    }
  }

  const handleCTA = async () => {
    if (hasPurchased || effectivePrice === 0) {
      if (contentType === 'coaching') {
        router.push('/schedule')
      } else {
        router.push(`/formations/${id}/learn`)
      }
      return
    }

    if (contentType === 'coaching' && !calSelSlot) {
      const el = document.getElementById('slot-picker')
      if (el) {
        const top = el.getBoundingClientRect().top + window.scrollY - 480
        window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
      }
      return
    }
    if (!user) { router.push('/login'); return }

    if (contentType === 'coaching' && pendingCount > 0) {
      setCreditConfirmTarget('slot')
      setShowCreditConfirm(true)
      return
    }
    await doStripeCheckout(true)
  }

  const handleBuyLater = async () => {
    if (!user) { router.push('/login'); return }
    if (pendingCount > 0) {
      setCreditConfirmTarget('later')
      setShowCreditConfirm(true)
      return
    }
    await doStripeCheckout(false)
  }

  /* video on sales page */
  const showVideoOnPage = contentType === 'video' && formation.video_url
  const videoType = formation.video_url?.includes('vimeo') ? 'vimeo' : 'youtube'
  const canWatchFull = hasPurchased || effectivePrice === 0

  return (
    <div style={{ minHeight: '100vh', background: '#05070a', color: CREAM,
      paddingTop: showBigSearch ? 200 : 80, transition: 'padding-top 0.4s cubic-bezier(0.4,0,0.2,1)' }}>

      {/* Atmospheric glow + grain */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: `radial-gradient(ellipse 80% 40% at 50% 0%, ${typeColor}22 0%, transparent 60%), radial-gradient(ellipse 40% 25% at 80% 60%, ${typeColor}08 0%, transparent 55%)` }} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', opacity: 0.035,
        backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")',
        backgroundRepeat: 'repeat', backgroundSize: '200px' }} />

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

          {/* Back + Logo + badge Élève */}
          <button onClick={() => router.back()} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px 8px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6, color: SILVER, flexShrink: 0, transition: 'color 0.15s, background 0.15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = CREAM; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(232,228,220,0.05)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = SILVER; (e.currentTarget as HTMLButtonElement).style.background = 'none' }}>
            <ArrowLeft size={15} />
          </button>
          <Link href="/formations" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <div style={{ width: 7, height: 7, borderRadius: 2, background: 'linear-gradient(135deg, #7c3aed, #06b6d4)', flexShrink: 0 }} />
            <span style={{ fontFamily: 'var(--font-syne, sans-serif)', fontWeight: 700, fontSize: 14, letterSpacing: '0.18em', color: CREAM }}>ONLYPOK</span>
          </Link>
          {user && (
            <span style={{ fontSize: 9, fontWeight: 700, color: profile?.role === 'coach' ? '#06b6d4' : '#7c3aed', padding: '2px 7px',
              border: `1px solid ${profile?.role === 'coach' ? 'rgba(6,182,212,0.35)' : 'rgba(124,58,237,0.35)'}`, borderRadius: 4, letterSpacing: '0.05em', flexShrink: 0 }}>
              {profile?.role === 'coach' ? 'Coach' : 'Élève'}
            </span>
          )}

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

            {user ? (
              <Link href="/dashboard"
                style={{ fontSize: 13, fontWeight: 600, color: SILVER, textDecoration: 'none',
                  padding: '8px 16px', border: '1px solid rgba(240,244,255,0.08)',
                  borderRadius: 10, transition: 'all 0.2s', whiteSpace: 'nowrap' }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = CREAM; (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(232,228,220,0.25)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = SILVER; (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(240,244,255,0.08)' }}>
                Mon espace
              </Link>
            ) : (
              <Link href="/register?role=coach"
                style={{ fontSize: 13, fontWeight: 600, color: SILVER, textDecoration: 'none',
                  padding: '8px 16px', border: '1px solid rgba(240,244,255,0.08)',
                  borderRadius: 10, transition: 'all 0.2s', whiteSpace: 'nowrap' }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = CREAM; (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(232,228,220,0.25)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = SILVER; (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(240,244,255,0.08)' }}>
                Devenir coach
              </Link>
            )}
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
                  {[['Mes formations', '/formations'], ['Coaches', '/coaches'], ['Tracker', '/track']].map(([label, href]) => (
                    <Link key={label} href={href}
                      style={{ display: 'block', padding: '9px 14px', fontSize: 13, color: SILVER, textDecoration: 'none', borderRadius: 8, transition: 'all 0.15s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(232,228,220,0.05)'; (e.currentTarget as HTMLAnchorElement).style.color = CREAM }}
                      onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'; (e.currentTarget as HTMLAnchorElement).style.color = SILVER }}>
                      {label}
                    </Link>
                  ))}
                  <button onClick={() => signOut()}
                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 14px', fontSize: 13, color: SILVER, background: 'transparent', border: 'none', borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(232,228,220,0.05)'; (e.currentTarget as HTMLButtonElement).style.color = CREAM }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = SILVER }}>
                    Déconnexion
                  </button>
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
      {/* ── Credit confirmation modal ── */}
      {showCreditConfirm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(7,9,14,0.88)',
          backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 20px' }}>
          <div style={{ background: '#0f1218', border: `1px solid ${typeColor}35`, borderRadius: 20, padding: '32px', maxWidth: 400, width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: `${typeColor}18`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Calendar size={18} color={typeColor} />
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: CREAM, letterSpacing: '-0.3px', margin: 0 }}>
                  Sessions existantes
                </h3>
              </div>
              <button onClick={() => setShowCreditConfirm(false)}
                style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid rgba(240,244,255,0.08)',
                  background: 'transparent', color: SILVER, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                <X size={14} />
              </button>
            </div>
            <p style={{ fontSize: 14, color: SILVER, lineHeight: 1.6, margin: '0 0 24px' }}>
              Tu as déjà{' '}
              <span style={{ color: CREAM, fontWeight: 700 }}>
                {pendingCount} session{pendingCount > 1 ? 's' : ''} avec ce coach
              </span>{' '}
              en attente de planification. Es-tu sûr de vouloir acheter ce pack en plus ?
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={async () => { setShowCreditConfirm(false); await doStripeCheckout(creditConfirmTarget === 'slot') }}
                style={{ width: '100%', padding: '13px', borderRadius: 11, border: 'none',
                  background: typeColor, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                Acheter ce pack
              </button>
              <button
                onClick={() => setShowCreditConfirm(false)}
                style={{ width: '100%', padding: '13px', borderRadius: 11,
                  border: '1px solid rgba(232,228,220,0.12)', background: 'transparent',
                  color: SILVER, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

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
          {/* Miniature principale / Avatar coach pour coaching */}
          {contentType === 'coaching' ? (
            <div style={{
              position: 'relative', overflow: 'hidden', aspectRatio: '16/9',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16,
              background: `linear-gradient(160deg, ${typeColor}30 0%, ${typeColor}10 50%, rgba(7,9,14,0.9) 100%)`,
            }}>
              <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse 80% 120% at 50% 60%, ${typeColor}18, transparent 70%)` }} />
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: `linear-gradient(to right, ${typeColor}, ${typeColor}60)` }} />
              {/* Avatar coach */}
              <div style={{
                width: 96, height: 96, borderRadius: '50%', flexShrink: 0,
                padding: 3,
                background: `conic-gradient(from 135deg, ${typeColor}, ${typeColor}44, ${typeColor}cc, ${typeColor})`,
                boxShadow: `0 8px 40px ${typeColor}40, 0 0 0 4px #07090e`,
                position: 'relative', zIndex: 1,
              }}>
                <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', background: '#0d1117', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {coach?.avatar_url
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={coach.avatar_url} alt={coach.username ?? 'Coach'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ fontSize: 32, fontWeight: 900, color: '#fff' }}>{(coach?.username ?? 'C').slice(0, 2).toUpperCase()}</span>
                  }
                </div>
              </div>
              <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
                <p style={{ fontSize: 16, fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.3px', fontFamily: 'var(--font-syne,sans-serif)' }}>{coach?.username ?? 'Coach'}</p>
                <p style={{ fontSize: 11, color: `${typeColor}cc`, margin: '4px 0 0', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Coaching personnalisé</p>
              </div>
            </div>
          ) : (() => {
            const crop = formation.thumbnail_crop
            const bgPos  = crop ? `${crop.x ?? 50}% ${crop.y ?? 50}%` : 'center'
            return (
              <div style={{
                position: 'relative', overflow: 'hidden',
                aspectRatio: '16/9',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                ...(formation.thumbnail_url ? {
                  backgroundImage: `url(${formation.thumbnail_url})`,
                  backgroundSize: 'cover',
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

          {/* 2 × 2 photos complémentaires (gallery_urls si coaching, sinon proofs) */}
          {(() => {
            const galleryUrls: string[] = formation.gallery_urls ?? []
            const useGallery = contentType === 'coaching' && galleryUrls.length > 0
            return (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 8, position: 'relative' }}>
                {([0,1,2,3] as const).map(i => {
                  if (useGallery) {
                    const url = galleryUrls[i]
                    return url ? (
                      <div key={i} style={{ position: 'relative', overflow: 'hidden', background: '#0f1218' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.3s' }}
                          onMouseEnter={e => (e.currentTarget as HTMLImageElement).style.transform = 'scale(1.04)'}
                          onMouseLeave={e => (e.currentTarget as HTMLImageElement).style.transform = 'scale(1)'} />
                        {i === 3 && galleryUrls.length > 4 && (
                          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>+{galleryUrls.length - 4} photos</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div key={i} style={{ background: 'rgba(232,228,220,0.02)', border: '1px dashed rgba(232,228,220,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 22, opacity: 0.06 }}>♠</span>
                      </div>
                    )
                  }
                  const proof = proofs[i]
                  return proof ? (
                    <div key={proof.id}
                      onClick={() => setShowProofModal(true)}
                      style={{ position: 'relative', overflow: 'hidden', cursor: 'pointer', background: '#0f1218' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={proof.url} alt={proof.caption ?? ''}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.3s' }}
                        onMouseEnter={e => (e.currentTarget as HTMLImageElement).style.transform = 'scale(1.04)'}
                        onMouseLeave={e => (e.currentTarget as HTMLImageElement).style.transform = 'scale(1)'} />
                      <div style={{ position: 'absolute', bottom: 7, left: 7 }}>
                        <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 99,
                          background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
                          color: 'rgba(232,228,220,0.75)', letterSpacing: '0.05em', textTransform: 'uppercase' as const }}>
                          {proof.category === 'stats'      ? 'Stats officielles'
                            : proof.category === 'longterme'  ? 'Long terme'
                            : proof.category === 'perf'       ? 'Top perfs'
                            : proof.category === 'eleves'     ? 'Transformations'
                            : proof.category === 'sharkscope' ? 'SharkScope'
                            : proof.category === 'pokerstats' ? 'PokerStats'
                            : proof.category === 'palmares'   ? 'Palmarès'
                            : 'Preuve'}
                        </span>
                      </div>
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
                {proofs.length > 0 && (
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
                )}
              </div>
            )
          })()}
        </div>

        {/* Titre + meta sous l'image */}
        <div style={{ marginTop: 32, marginBottom: 48 }}>
          {/* Séparateur accent */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
            <div style={{ height: 2, width: 32, background: typeColor, borderRadius: 99, boxShadow: `0 0 8px ${typeColor}` }} />
            <span style={{ fontSize: 10, letterSpacing: '0.2em', fontWeight: 700, color: typeColor, textTransform: 'uppercase' as const }}>
              {TYPE_LABELS[contentType]}
              {formation.variant ? ` · ${formation.variant}` : ''}
            </span>
          </div>
          <h1 style={{
            fontSize: 'clamp(20px, 2.2vw, 30px)', fontWeight: 700, color: CREAM,
            letterSpacing: '-0.5px', lineHeight: 1.25, marginBottom: 16,
          }}>
            {formation.title}
          </h1>
          {formation.short_desc && (
            <p style={{ fontSize: 16, color: 'rgba(232,228,220,0.55)', lineHeight: 1.7, marginBottom: 24, maxWidth: 640, fontWeight: 400 }}>
              {formation.short_desc}
            </p>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, flexWrap: 'wrap' }}>
            {avgRating !== null && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingRight: 20 }}>
                <Star size={14} color="#a855f7" fill="#a855f7" />
                <span style={{ fontSize: 14, fontWeight: 800, color: CREAM }}>{avgRating.toFixed(2)}</span>
                <span style={{ fontSize: 13, color: SILVER }}>({reviews.length} avis)</span>
              </div>
            )}
            {avgRating !== null && coach?.username && (
              <div style={{ width: 1, height: 16, background: 'rgba(232,228,220,0.12)', marginRight: 20 }} />
            )}
            {coach?.username && (
              <Link href={`/coaches/${coach.id}`}
                style={{ fontSize: 13, color: SILVER, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8, paddingRight: 20, transition: 'color 0.15s' }}
                onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.color = CREAM}
                onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.color = SILVER}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
                  background: `linear-gradient(135deg, ${typeColor}, ${typeColor}88)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 800, color: '#fff',
                  boxShadow: `0 0 0 2px ${typeColor}30`,
                }}>
                  {coach.avatar_url
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={coach.avatar_url} alt={coach.username ?? 'Coach'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : (coach.username ?? 'C')[0].toUpperCase()}
                </div>
                <span style={{ fontWeight: 500 }}>{coach.username}</span>
              </Link>
            )}
            {contentType === 'formation' && allLessons.length > 0 && (
              <>
                <div style={{ width: 1, height: 16, background: 'rgba(232,228,220,0.12)', marginRight: 20 }} />
                <span style={{ fontSize: 13, color: SILVER, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <BookOpen size={13} />
                  <span>{allLessons.length} leçons</span>
                  <span style={{ opacity: 0.4 }}>·</span>
                  <span>{chapters.length} chapitres</span>
                </span>
              </>
            )}
          </div>

          {/* First review snippet above fold */}
          {reviews.length > 0 && reviews[0]?.comment && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 22,
              padding: '12px 16px', borderRadius: 12,
              background: `${typeColor}06`, border: `1px solid ${typeColor}18`, maxWidth: 580 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
                background: reviews[0].student?.avatar_url ? 'transparent' : `linear-gradient(135deg, ${typeColor}, ${typeColor}88)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, color: '#fff' }}>
                {reviews[0].student?.avatar_url
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={reviews[0].student.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : (reviews[0].student?.username ?? 'E')[0].toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, color: 'rgba(240,244,255,0.65)', fontStyle: 'italic', lineHeight: 1.55, margin: '0 0 5px' }}>
                  &ldquo;{reviews[0].comment.length > 130 ? reviews[0].comment.slice(0, 130) + '…' : reviews[0].comment}&rdquo;
                </p>
                <p style={{ fontSize: 11, color: SILVER, margin: 0, fontWeight: 600 }}>
                  {reviews[0].student?.username ?? 'Élève'} · <span style={{ color: '#f59e0b' }}>{'★'.repeat(Math.round(reviews[0].rating))}</span>
                </p>
              </div>
            </div>
          )}
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
                      <button onClick={handleCTA} disabled={paying} style={{ padding: '9px 20px', borderRadius: 9, border: 'none', background: typeColor, color: '#fff', fontSize: 13, fontWeight: 700, cursor: paying ? 'wait' : 'pointer' }}>{paying ? 'Redirection…' : ctaLabel}</button>
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
              <div style={{ padding: '36px 0', borderBottom: '1px solid rgba(232,228,220,0.06)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(chosen.length, 3)}, 1fr)`, gap: 2 }}>
                  {chosen.map((h, i) => (
                    <div key={h.id} style={{
                      display: 'flex', flexDirection: 'column', gap: 14,
                      padding: '24px 22px',
                      background: i === 0 ? `${typeColor}08` : 'transparent',
                      borderRadius: i === 0 ? 14 : 0,
                      border: i === 0 ? `1px solid ${typeColor}18` : 'none',
                    }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                        background: i === 0 ? `${typeColor}20` : 'rgba(232,228,220,0.06)',
                        border: `1px solid ${i === 0 ? typeColor + '35' : 'rgba(232,228,220,0.08)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: i === 0 ? typeColor : SILVER,
                      }}>
                        <h.Icon size={20} />
                      </div>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 700, color: CREAM, margin: '0 0 4px', letterSpacing: '-0.2px' }}>{h.label}</p>
                        <p style={{ fontSize: 12, color: 'rgba(232,228,220,0.45)', margin: 0, lineHeight: 1.55 }}>{h.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}

          {/* ── 3. DESCRIPTION ── */}
          {formation.description && (
            <div style={{ padding: '40px 0', borderBottom: '1px solid rgba(232,228,220,0.06)' }}>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: CREAM, letterSpacing: '-0.5px', marginBottom: 18 }}>
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '40px 0', borderBottom: '1px solid rgba(232,228,220,0.06)' }}>
              <div>
                <h2 style={{ fontSize: 24, fontWeight: 800, color: CREAM, margin: '0 0 8px', letterSpacing: '-0.5px' }}>
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
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: `linear-gradient(135deg, ${typeColor}, ${typeColor}88)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, color: '#fff', flexShrink: 0, overflow: 'hidden' }}>
                  {coach.avatar_url
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={coach.avatar_url} alt={coach.username ?? 'Coach'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : (coach.username ?? 'C')[0].toUpperCase()}
                </div>
              </Link>
            </div>
          )}

          {/* ── 4a. PROGRAMME (formation) ── */}
          {contentType === 'formation' && chapters.length > 0 && (
            <div style={{ padding: '40px 0', borderBottom: '1px solid rgba(232,228,220,0.06)' }}>
              {/* Header avec stats */}
              <div style={{ marginBottom: 28 }}>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: CREAM, letterSpacing: '-0.5px', margin: '0 0 10px' }}>Programme de la formation</h2>
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
            <div style={{ padding: '40px 0', borderBottom: '1px solid rgba(232,228,220,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: CREAM, letterSpacing: '-0.5px', margin: 0 }}>Packs disponibles</h2>
                {weekendMultiplier > 1 && (
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.35)', color: '#f59e0b' }}>
                    Tarif week-end +{weekendPct}%
                  </span>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(packs.length, 3)}, 1fr)`, gap: 12 }}>
                {packs.map((pack: any, i: number) => {
                  const displayPrice = applyWeekend(pack.price)
                  return (
                    <div key={i} onClick={() => setSelectedPack(i)}
                      style={{ background: selectedPack === i ? `${typeColor}12` : 'rgba(232,228,220,0.03)', border: `1px solid ${selectedPack === i ? typeColor + '50' : 'rgba(232,228,220,0.08)'}`, borderRadius: 14, padding: '20px', cursor: 'pointer', transition: 'all 0.2s' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: CREAM }}>{pack.label}</span>
                        {selectedPack === i && <Check size={14} color={typeColor} />}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
                        <span style={{ fontSize: 22, fontWeight: 800, color: selectedPack === i ? typeColor : CREAM }}>{displayPrice}€</span>
                        {weekendMultiplier > 1 && <span style={{ fontSize: 11, color: SILVER, textDecoration: 'line-through' }}>{pack.price}€</span>}
                      </div>
                      <div style={{ fontSize: 11, color: SILVER, marginBottom: 8 }}>{pack.hours}h · {pack.hours > 0 && displayPrice > 0 ? Math.round(displayPrice / pack.hours) + '€/h' : ''}</div>
                      {pack.desc && <p style={{ fontSize: 12, color: SILVER, lineHeight: 1.5, margin: 0 }}>{pack.desc}</p>}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── 4c. NATIVE SLOT PICKER (coaching) ── */}
          {contentType === 'coaching' && (
            <div id="slot-picker" style={{ padding: '40px 0', borderBottom: '1px solid rgba(232,228,220,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <Calendar size={18} color={typeColor} />
                <h2 style={{ fontSize: 22, fontWeight: 800, color: CREAM, letterSpacing: '-0.5px', margin: 0 }}>Choisis ton créneau</h2>
              </div>
              <p style={{ fontSize: 14, color: SILVER, marginBottom: 24 }}>Sélectionne un jour puis un horaire disponible</p>

              {calLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '32px 0', color: SILVER }}>
                  <Loader2 size={18} style={{ animation: 'spin 1s linear infinite', color: typeColor }} />
                  <span style={{ fontSize: 13 }}>Chargement des créneaux…</span>
                </div>
              ) : calSlots.length === 0 ? (
                <div style={{ padding: '24px', borderRadius: 16, background: 'rgba(240,244,255,0.03)', border: '1px solid rgba(240,244,255,0.08)', textAlign: 'center' }}>
                  <Clock size={28} color={SILVER} style={{ opacity: 0.4, marginBottom: 12 }} />
                  <p style={{ fontSize: 14, color: SILVER, margin: 0 }}>Aucun créneau disponible pour le moment.</p>
                  <p style={{ fontSize: 12, color: SILVER, opacity: 0.6, marginTop: 6 }}>Revenez bientôt ou contactez le coach directement.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 16, alignItems: 'start' }}>

                  {/* Calendar */}
                  <div style={{ background: 'rgba(232,228,220,0.03)', border: '1px solid rgba(232,228,220,0.08)', borderRadius: 18, padding: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                      <button onClick={() => { if (calMonth === 0) { setCalYear(y => y-1); setCalMonth(11) } else setCalMonth(m => m-1); setCalSelDay(null); setCalSelSlot(null) }}
                        style={{ background: 'none', border: 'none', color: SILVER, cursor: 'pointer', padding: 4, borderRadius: 6, display: 'flex' }}>
                        <ChevronLeft size={16} />
                      </button>
                      <span style={{ fontWeight: 700, fontSize: 14, color: CREAM }}>{MONTH_NAMES[calMonth]} {calYear}</span>
                      <button onClick={() => { if (calMonth === 11) { setCalYear(y => y+1); setCalMonth(0) } else setCalMonth(m => m+1); setCalSelDay(null); setCalSelSlot(null) }}
                        style={{ background: 'none', border: 'none', color: SILVER, cursor: 'pointer', padding: 4, borderRadius: 6, display: 'flex' }}>
                        <ChevronRight size={16} />
                      </button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3, marginBottom: 6 }}>
                      {CAL_DAYS.map(d => <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: SILVER, paddingBottom: 4 }}>{d}</div>)}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3 }}>
                      {(() => {
                        const { offset, daysInMonth } = calGetMonthDays(calYear, calMonth)
                        const slotDays = new Set<string>()
                        calSlots.forEach(s => { if (s.getFullYear() === calYear && s.getMonth() === calMonth) slotDays.add(calFormatDate(s)) })
                        const todayDate = new Date()
                        return [
                          ...Array.from({ length: offset }).map((_, i) => <div key={`e${i}`} />),
                          ...Array.from({ length: daysInMonth }, (_, i) => {
                            const day  = i + 1
                            const date = new Date(calYear, calMonth, day)
                            const key  = calFormatDate(date)
                            const has  = slotDays.has(key)
                            const past = date < todayDate && !calIsSameDay(date, todayDate)
                            const sel  = calSelDay ? calIsSameDay(calSelDay, date) : false
                            const isTd = calIsSameDay(date, todayDate)
                            return (
                              <button key={day} disabled={!has || past} onClick={() => { setCalSelDay(date); setCalSelSlot(null) }}
                                style={{ aspectRatio: '1', borderRadius: 7, border: 'none', fontSize: 12, fontWeight: sel ? 800 : 400, cursor: has && !past ? 'pointer' : 'default', background: sel ? `linear-gradient(135deg,${typeColor},#06b6d4)` : has && !past ? `${typeColor}18` : 'transparent', color: sel ? '#fff' : has && !past ? '#c4b5fd' : past ? 'rgba(138,138,138,0.25)' : SILVER, outline: isTd && !sel ? `2px solid ${typeColor}40` : 'none', outlineOffset: -2, transition: 'all 0.15s' }}>
                                {day}
                              </button>
                            )
                          }),
                        ]
                      })()}
                    </div>
                  </div>

                  {/* Time slots */}
                  <div style={{ background: 'rgba(232,228,220,0.03)', border: '1px solid rgba(232,228,220,0.08)', borderRadius: 18, padding: 20, minHeight: 180 }}>
                    {!calSelDay ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 180, gap: 10 }}>
                        <Calendar size={28} color={SILVER} style={{ opacity: 0.35 }} />
                        <p style={{ color: SILVER, fontSize: 12, textAlign: 'center', margin: 0 }}>Sélectionne un jour</p>
                      </div>
                    ) : (() => {
                      const daySlots = calSlots.filter(s => calIsSameDay(s, calSelDay))
                      return daySlots.length === 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 180, gap: 10 }}>
                          <Clock size={28} color={SILVER} style={{ opacity: 0.35 }} />
                          <p style={{ color: SILVER, fontSize: 12, margin: 0 }}>Aucun créneau ce jour</p>
                        </div>
                      ) : (
                        <>
                          <h3 style={{ fontSize: 13, fontWeight: 700, color: CREAM, marginBottom: 12 }}>
                            {calSelDay.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                          </h3>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 7 }}>
                            {daySlots.map((slot, i) => {
                              const isSel = calSelSlot ? calSelSlot.getTime() === slot.getTime() : false
                              return (
                                <button key={i} onClick={() => setCalSelSlot(isSel ? null : slot)}
                                  style={{ padding: '9px 0', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s', background: isSel ? `linear-gradient(135deg,${typeColor},#06b6d4)` : 'rgba(232,228,220,0.05)', border: isSel ? 'none' : '1px solid rgba(232,228,220,0.1)', color: isSel ? '#fff' : CREAM, boxShadow: isSel ? `0 4px 16px ${typeColor}40` : 'none' }}>
                                  {slot.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                </button>
                              )
                            })}
                          </div>
                        </>
                      )
                    })()}
                  </div>
                </div>
              )}

              {calSelSlot && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, padding: '11px 16px', borderRadius: 12, background: `${typeColor}10`, border: `1px solid ${typeColor}30` }}>
                  <CheckCircle size={15} color={typeColor} />
                  <span style={{ fontSize: 13, color: CREAM, fontWeight: 600 }}>
                    Créneau sélectionné : {calSelSlot.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} à {calSelSlot.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <button onClick={() => { setCalSelSlot(null); setCalSelDay(null) }}
                    style={{ marginLeft: 'auto', background: 'none', border: 'none', color: SILVER, cursor: 'pointer', display: 'flex', padding: 2 }}>
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>
          )}

        </div>

        {/* ── Colonne droite sticky ── */}
        <div style={{ position: 'sticky', top: 200 }}>
          <div style={{
            background: 'linear-gradient(180deg, #0e1118 0%, #0a0d12 100%)',
            border: '1px solid rgba(240,244,255,0.09)',
            borderRadius: 22, overflow: 'hidden',
            boxShadow: `0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.03), inset 0 1px 0 rgba(255,255,255,0.06)`,
          }}>
            {/* Glow accent bande en haut */}
            <div style={{ height: 3, background: `linear-gradient(to right, ${typeColor}, ${typeColor}80, transparent)` }} />

            {contentType !== 'coaching' && formation.thumbnail_url && (
              <div style={{ height: 165, backgroundImage: `url(${formation.thumbnail_url})`, backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' }}>
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, #0e1118 100%)' }} />
              </div>
            )}

            <div style={{ padding: '24px 24px 20px' }}>
              {contentType === 'coaching' && packs.length > 0 && (
                <>
                  <div style={{ display: 'flex', gap: 0, marginBottom: 20, background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 3 }}>
                    {packs.map((pack: any, i: number) => (
                      <button key={i} onClick={() => setSelectedPack(i)}
                        style={{ flex: 1, padding: '8px 4px', border: 'none', borderRadius: 8, background: selectedPack === i ? typeColor : 'transparent', color: selectedPack === i ? '#fff' : SILVER, fontSize: 11, fontWeight: selectedPack === i ? 700 : 400, cursor: 'pointer', transition: 'all 0.2s', boxShadow: selectedPack === i ? `0 2px 10px ${typeColor}50` : 'none' }}>
                        {pack.label}
                      </button>
                    ))}
                  </div>
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ marginBottom: 3 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: SILVER, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{currentPack?.label}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                      <span style={{ fontSize: 38, fontWeight: 900, color: CREAM, letterSpacing: '-1.5px', lineHeight: 1 }}>{currentPack ? applyWeekend(currentPack.price) : ''}</span>
                      <span style={{ fontSize: 18, fontWeight: 600, color: SILVER }}>€</span>
                      <span style={{ fontSize: 13, color: 'rgba(232,228,220,0.35)', marginLeft: 2 }}>/ {currentPack?.hours}h</span>
                    </div>
                    {currentPack?.hours > 0 && <p style={{ fontSize: 12, color: 'rgba(232,228,220,0.3)', margin: '6px 0 0' }}>soit {Math.round(applyWeekend(currentPack.price) / currentPack.hours)}€/h</p>}
                  </div>
                </>
              )}
              {contentType !== 'coaching' && (
                <div style={{ marginBottom: 22 }}>
                  {formation.price === 0 ? (
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                      <span style={{ fontSize: 38, fontWeight: 900, color: '#06b6d4', letterSpacing: '-1.5px', lineHeight: 1 }}>Gratuit</span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                      <span style={{ fontSize: 38, fontWeight: 900, color: CREAM, letterSpacing: '-1.5px', lineHeight: 1 }}>{formation.price}</span>
                      <span style={{ fontSize: 18, fontWeight: 600, color: SILVER }}>€</span>
                    </div>
                  )}
                  {hasPurchased && formation.price > 0 && (
                    <span style={{ fontSize: 12, color: '#06b6d4', display: 'flex', alignItems: 'center', gap: 5, marginTop: 8 }}>
                      <CheckCircle size={12} /> Déjà acheté — accès illimité
                    </span>
                  )}
                </div>
              )}

              {/* CTA button */}
              <button onClick={handleCTA} disabled={ctaDisabled}
                style={{
                  width: '100%', padding: '15px 20px', borderRadius: 13, border: 'none',
                  background: hasPurchased
                    ? 'rgba(6,182,212,0.12)'
                    : ctaDisabled && !paying
                      ? 'rgba(255,255,255,0.05)'
                      : `linear-gradient(135deg, ${typeColor} 0%, ${typeColor}cc 100%)`,
                  color: hasPurchased ? '#06b6d4' : ctaDisabled && !paying ? SILVER : '#fff',
                  fontSize: 14, fontWeight: 800, cursor: ctaDisabled ? 'default' : 'pointer',
                  opacity: paying ? 0.75 : 1,
                  boxShadow: hasPurchased || ctaDisabled ? 'none' : `0 8px 32px ${typeColor}45, inset 0 1px 0 rgba(255,255,255,0.15)`,
                  transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
                  letterSpacing: '0.01em', marginBottom: checkoutError ? 12 : 20,
                  position: 'relative', overflow: 'hidden',
                }}
                onMouseEnter={e => { if (!ctaDisabled) { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 16px 48px ${typeColor}65, inset 0 1px 0 rgba(255,255,255,0.25)` } }}
                onMouseLeave={e => { if (!ctaDisabled) { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 8px 32px ${typeColor}45, inset 0 1px 0 rgba(255,255,255,0.15)` } }}>
                {paying ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                    Redirection…
                  </span>
                ) : ctaLabel}
              </button>

              {/* Acheter à nouveau — visible si coaching déjà acheté */}
              {hasPurchased && contentType === 'coaching' && isCoachingPaid && (
                <button onClick={handleBuyLater} disabled={paying} style={{
                  width: '100%', padding: '13px', borderRadius: 12,
                  border: `1.5px solid ${typeColor}`,
                  background: `${typeColor}18`,
                  color: typeColor, fontSize: 13, fontWeight: 700,
                  cursor: paying ? 'wait' : 'pointer', marginBottom: 16,
                  transition: 'all 0.18s cubic-bezier(0.4,0,0.2,1)',
                  letterSpacing: '0.01em',
                }}
                  onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = `${typeColor}30`; b.style.boxShadow = `0 0 24px ${typeColor}40`; b.style.transform = 'translateY(-1px)' }}
                  onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = `${typeColor}18`; b.style.boxShadow = 'none'; b.style.transform = 'translateY(0)' }}>
                  Racheter — {applyWeekend(effectivePrice)}€ →
                </button>
              )}

              {/* Acheter sans créneau — visible si coaching non acheté et pas de slot sélectionné */}
              {contentType === 'coaching' && isCoachingPaid && !calSelSlot && !hasPurchased && (
                <button onClick={handleBuyLater} disabled={paying} style={{
                  width: '100%', padding: '13px', borderRadius: 12,
                  border: `1.5px solid ${typeColor}`,
                  background: `${typeColor}18`,
                  color: typeColor, fontSize: 13, fontWeight: 700,
                  cursor: paying ? 'wait' : 'pointer', marginBottom: 16,
                  transition: 'all 0.18s cubic-bezier(0.4,0,0.2,1)',
                  boxShadow: `0 0 0 0 ${typeColor}00`,
                  letterSpacing: '0.01em',
                }}
                  onMouseEnter={e => {
                    const b = e.currentTarget as HTMLButtonElement
                    b.style.background = `${typeColor}30`
                    b.style.boxShadow = `0 0 24px ${typeColor}40`
                    b.style.transform = 'translateY(-1px)'
                  }}
                  onMouseLeave={e => {
                    const b = e.currentTarget as HTMLButtonElement
                    b.style.background = `${typeColor}18`
                    b.style.boxShadow = `0 0 0 0 ${typeColor}00`
                    b.style.transform = 'translateY(0)'
                  }}>
                  Acheter{effectivePrice > 0 ? ` — ${applyWeekend(effectivePrice)}€` : ''} · planifier plus tard →
                </button>
              )}

              {checkoutError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '9px 13px', marginBottom: 16, fontSize: 12, color: '#fca5a5' }}>
                  <X size={13} style={{ flexShrink: 0 }} /> {checkoutError}
                </div>
              )}

              {/* Features list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9, paddingTop: 18, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                  <Shield size={11} color="rgba(232,228,220,0.25)" />
                  <p style={{ fontSize: 11, color: 'rgba(232,228,220,0.25)', margin: 0 }}>
                    Satisfait ou remboursé · 7 jours
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ══ REVIEWS — pleine largeur centrée (Image #28) ══ */}
      <div id="comments-section" style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto', padding: '0 40px 100px' }}>
        <div style={{ borderTop: '1px solid rgba(232,228,220,0.06)', paddingTop: 64 }}>

          {/* En-tête avis */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 52 }}>
            <div>
              <h2 style={{ fontSize: 28, fontWeight: 900, color: CREAM, letterSpacing: '-0.7px', margin: '0 0 4px' }}>
                {reviews.length === 0 ? 'Avis' : `${reviews.length} avis`}
              </h2>
              {reviews.length > 0 && avgRating !== null && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  {[1,2,3,4,5].map(i => <Star key={i} size={12} color="#a855f7" fill={i <= Math.round(avgRating) ? '#a855f7' : 'none'} style={{ opacity: i <= Math.round(avgRating) ? 1 : 0.2 }} />)}
                  <span style={{ fontSize: 13, fontWeight: 700, color: CREAM, marginLeft: 4 }}>{avgRating.toFixed(2)}</span>
                  <span style={{ fontSize: 13, color: SILVER }}>· {reviews.length} avis vérifiés</span>
                </div>
              )}
            </div>
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

          {(contentType === 'video' || contentType === 'formation') && (
            <VideoComments
              formationId={formation.id}
              coachId={formation.coach?.id}
              videoUrl={contentType === 'video' ? formation.video_url : undefined}
            />
          )}
        </div>
      </div>

      {/* ══ COACH PRESENTATION — Faites connaissance ══ */}
      {coach && (
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 40px 120px' }}>
          <div style={{ borderTop: '1px solid rgba(232,228,220,0.06)', paddingTop: 64 }}>
            <h2 style={{ fontSize: 28, fontWeight: 900, color: CREAM, letterSpacing: '-0.7px', margin: '0 0 36px' }}>
              Faites connaissance avec votre coach
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 48, alignItems: 'start' }}>

              {/* ── Colonne gauche : avatar + stats ── */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                {/* Avatar */}
                <div style={{ width: 110, height: 110, borderRadius: '50%', background: `linear-gradient(135deg, ${typeColor}, ${typeColor}88)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, fontWeight: 800, color: '#fff', overflow: 'hidden', boxShadow: `0 0 0 3px #07090e, 0 0 0 5px ${typeColor}40` }}>
                  {coach.avatar_url
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={coach.avatar_url} alt={coach.username ?? 'Coach'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : (coach.username ?? 'C')[0].toUpperCase()}
                </div>
                {/* Nom + badge */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 17, fontWeight: 800, color: CREAM }}>{coach.username}</span>
                    {coach.is_pro && (
                      <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: `${typeColor}20`, color: typeColor, border: `1px solid ${typeColor}40` }}>PRO</span>
                    )}
                    {isSuperCoach && (
                      <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: 'rgba(255,216,107,0.12)', color: '#ffd86b', border: '1px solid rgba(255,216,107,0.3)' }}>SUPER COACH</span>
                    )}
                  </div>
                  {avgRating !== null && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 6 }}>
                      <Star size={12} color="#a855f7" fill="#a855f7" />
                      <span style={{ fontSize: 13, fontWeight: 700, color: CREAM }}>{avgRating.toFixed(1)}</span>
                      <span style={{ fontSize: 12, color: SILVER }}>· {reviews.length} avis</span>
                    </div>
                  )}
                </div>
                {/* Stats */}
                <div style={{ width: '100%', background: 'rgba(232,228,220,0.03)', border: '1px solid rgba(232,228,220,0.07)', borderRadius: 12, overflow: 'hidden' }}>
                  {coach.years_experience != null && coach.years_experience > 0 && (
                    <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(232,228,220,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: SILVER }}>Expérience</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: CREAM }}>{coach.years_experience} an{coach.years_experience > 1 ? 's' : ''}</span>
                    </div>
                  )}
                  {reviews.length > 0 && (
                    <div style={{ padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: SILVER }}>Avis vérifiés</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: CREAM }}>{reviews.length}</span>
                    </div>
                  )}
                </div>
                {/* Link to full profile */}
                <Link href={`/coaches/${coach.id}`} style={{ textDecoration: 'none', width: '100%' }}>
                  <button style={{ width: '100%', padding: '11px', borderRadius: 10, background: 'rgba(232,228,220,0.06)', border: '1px solid rgba(232,228,220,0.12)', color: CREAM, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(232,228,220,0.1)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(232,228,220,0.06)')}>
                    Voir le profil complet
                  </button>
                </Link>
                {proofs.length > 0 && (
                  <button onClick={() => setShowProofModal(true)} style={{ width: '100%', padding: '11px', borderRadius: 10, border: `1px solid ${typeColor}40`, background: `${typeColor}10`, color: typeColor, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    Voir les preuves ({proofs.length})
                  </button>
                )}
              </div>

              {/* ── Colonne droite : infos ── */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

                {/* Bio */}
                {coach.bio ? (
                  <p style={{ fontSize: 15, color: 'rgba(240,244,255,0.78)', lineHeight: 1.75, margin: 0 }}>{coach.bio}</p>
                ) : (
                  <p style={{ fontSize: 14, color: 'rgba(138,138,138,0.4)', fontStyle: 'italic', margin: 0 }}>Ce coach n&apos;a pas encore renseigné sa bio.</p>
                )}

                {/* Spécialités */}
                {(coach.variants as string[] | undefined)?.length ? (
                  <div>
                    <h4 style={{ fontSize: 11, fontWeight: 700, color: 'rgba(240,244,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 10px' }}>Spécialités</h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {(coach.variants as string[]).map((v: string) => {
                        const vc = VARIANT_COLORS[v] ?? typeColor
                        return (
                          <span key={v} style={{ padding: '6px 14px', borderRadius: 99, fontSize: 12, fontWeight: 700, background: `${vc}15`, color: vc, border: `1px solid ${vc}35` }}>{v}</span>
                        )
                      })}
                    </div>
                  </div>
                ) : null}

                {/* Rooms */}
                {(coach.rooms as string[] | undefined)?.length ? (
                  <div>
                    <h4 style={{ fontSize: 11, fontWeight: 700, color: 'rgba(240,244,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 10px' }}>Joue sur</h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
                      {(coach.rooms as string[]).filter((r: string) => r !== 'PMU Poker').map((room: string) => {
                        const logoSrc: Record<string, string> = {
                          'PokerStars': '/logos/pokerstars.svg',
                          'Winamax':    '/logos/winamax.png',
                          'Betclic':    '/logos/betclic.svg',
                          'GGPoker':    '/logos/ggpoker.webp',
                          'Unibet':     '/logos/unibet.svg',
                          'bwin':       '/logos/bwin.svg',
                          'PartyPoker': '/logos/partypoker.svg',
                          '888poker':   '/logos/888poker.png',
                          'iPoker':     '/logos/ipoker.svg',
                        }
                        const whiteFilter: Record<string, boolean> = { 'PartyPoker': true, '888poker': true }
                        const src = logoSrc[room]
                        return src ? (
                          <div key={room} title={room} style={{ width: 80, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={src} alt={room} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', filter: whiteFilter[room] ? 'brightness(0) invert(1)' : 'brightness(0.9) saturate(0.85)', opacity: 0.85 }} />
                          </div>
                        ) : (
                          <span key={room} style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: 'rgba(240,244,255,0.05)', color: CREAM, border: '1px solid rgba(240,244,255,0.1)' }}>{room}</span>
                        )
                      })}
                    </div>
                  </div>
                ) : null}

                {/* Co-coachs */}
                {coCoaches.length > 0 && (
                  <div>
                    <h4 style={{ fontSize: 11, fontWeight: 700, color: 'rgba(240,244,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 10px' }}>Co-coachs</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {coCoaches.map(cc => (
                        <div key={cc.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ width: 36, height: 36, borderRadius: '50%', background: `linear-gradient(135deg, ${typeColor}30, rgba(232,228,220,0.06))`, border: '1px solid rgba(240,244,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: CREAM, flexShrink: 0 }}>
                            {(cc.username ?? 'C')[0].toUpperCase()}
                          </div>
                          <span style={{ fontSize: 14, color: CREAM }}>{cc.username}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes airbnbPop { from { opacity:0; transform:translateY(-8px) scale(0.98); } to { opacity:1; transform:translateY(0) scale(1); } }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
        @keyframes ctaPillIn { from { opacity:0; transform:scale(0.92) translateX(12px); } to { opacity:1; transform:scale(1) translateX(0); } }
      `}</style>
    </div>
  )
}
