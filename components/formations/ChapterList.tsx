'use client'
import { useState } from 'react'
import { ChevronDown, Lock, CheckCircle, PlayCircle, FileText } from 'lucide-react'

type Lesson = {
  id: string
  title: string
  duration: number
  is_free: boolean
  video_url: string | null
  pdf_url: string | null
  video_type: string | null
}

type Chapter = {
  id: string
  title: string
  order_index: number
  formation_lessons: Lesson[]
}

type Props = {
  chapters: Chapter[]
  hasPurchased: boolean
  completedLessons: string[]
  currentLessonId: string | null
  onSelectLesson: (lesson: Lesson) => void
  onComplete: (lessonId: string) => void
}

export default function ChapterList({ chapters, hasPurchased, completedLessons, currentLessonId, onSelectLesson, onComplete }: Props) {
  const [openChapters, setOpenChapters] = useState<string[]>(chapters[0] ? [chapters[0].id] : [])

  const toggleChapter = (id: string) => {
    setOpenChapters(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id])
  }

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    return m > 0 ? `${m}min` : `${seconds}s`
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {chapters.map(chapter => {
        const isOpen = openChapters.includes(chapter.id)
        const lessons = chapter.formation_lessons ?? []
        const completedCount = lessons.filter(l => completedLessons.includes(l.id)).length

        return (
          <div key={chapter.id} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
            <div
              onClick={() => toggleChapter(chapter.id)}
              style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
            >
              <div>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{chapter.title}</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 10 }}>{completedCount}/{lessons.length} leçons</span>
              </div>
              <ChevronDown size={16} style={{ color: 'var(--text-muted)', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </div>

            {isOpen && (
              <div style={{ borderTop: '1px solid var(--border)' }}>
                {lessons.map(lesson => {
                  const isLocked = !lesson.is_free && !hasPurchased
                  const isCompleted = completedLessons.includes(lesson.id)
                  const isCurrent = currentLessonId === lesson.id

                  return (
                    <div
                      key={lesson.id}
                      onClick={() => !isLocked && onSelectLesson(lesson)}
                      style={{
                        padding: '12px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        cursor: isLocked ? 'not-allowed' : 'pointer',
                        background: isCurrent ? 'var(--accent-glow)' : 'transparent',
                        borderLeft: isCurrent ? '2px solid var(--accent)' : '2px solid transparent',
                        opacity: isLocked ? 0.5 : 1,
                        transition: 'background 0.15s',
                      }}
                    >
                      {isLocked ? (
                        <Lock size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                      ) : isCompleted ? (
                        <CheckCircle size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                      ) : (
                        <PlayCircle size={14} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                      )}
                      <span style={{ flex: 1, fontSize: 13, color: isCurrent ? 'var(--accent)' : 'var(--text-primary)' }}>{lesson.title}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {lesson.pdf_url && <FileText size={12} style={{ color: 'var(--text-muted)' }} />}
                        {lesson.duration > 0 && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatDuration(lesson.duration)}</span>}
                        {lesson.is_free && !hasPurchased && (
                          <span style={{ fontSize: 10, background: 'var(--accent-glow)', color: 'var(--accent)', padding: '2px 6px', borderRadius: 99, border: '1px solid rgba(16,185,129,0.3)' }}>FREE</span>
                        )}
                      </div>
                      {isCompleted && !isLocked && (
                        <button
                          onClick={e => { e.stopPropagation(); onComplete(lesson.id) }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 11 }}
                        >
                          ✓
                        </button>
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
  )
}
