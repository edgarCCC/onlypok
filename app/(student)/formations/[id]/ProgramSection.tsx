'use client'
import { useState } from 'react'
import { BookOpen, PlayCircle, ChevronDown, ChevronUp, Lock } from 'lucide-react'
import { CREAM, SILVER, getYtId } from './shared'

/* ─── Programme de la formation : accordéon chapitres / leçons ──────────────── */
export default function ProgramSection({ chapters, typeColor, hasPurchased, allLessonsCount, freeLessons, onPlayLesson }: {
  chapters: any[]
  typeColor: string
  hasPurchased: boolean
  allLessonsCount: number
  freeLessons: number
  onPlayLesson: (lesson: { url: string; type: string; title: string }) => void
}) {
  const [openChapters, setOpenChapters] = useState<string[]>(
    chapters.length > 0 ? [chapters[0].id] : []
  )

  return (
    <div style={{ padding: '40px 0', borderBottom: '1px solid rgba(232,228,220,0.06)' }}>
      {/* Header avec stats */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: CREAM, letterSpacing: '-0.5px', margin: '0 0 10px' }}>Programme de la formation</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: SILVER, display: 'flex', alignItems: 'center', gap: 5 }}>
            <BookOpen size={13} /> {chapters.length} chapitres
          </span>
          <span style={{ fontSize: 13, color: SILVER, display: 'flex', alignItems: 'center', gap: 5 }}>
            <PlayCircle size={13} /> {allLessonsCount} leçons
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
                        onClick={canPlay ? () => onPlayLesson({ url: lesson.video_url, type: lesson.video_type ?? 'youtube', title: lesson.title }) : undefined}
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
  )
}
