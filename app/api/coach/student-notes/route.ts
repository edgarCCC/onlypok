import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

/* SQL à exécuter une fois sur Supabase :

CREATE TABLE IF NOT EXISTS coach_student_notes (
  coach_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id  UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content     TEXT NOT NULL DEFAULT '',
  updated_at  TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (coach_id, student_id)
);

ALTER TABLE coach_student_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notes_coach_only" ON coach_student_notes
  FOR ALL USING (auth.uid() = coach_id)
  WITH CHECK (auth.uid() = coach_id);
*/

// GET /api/coach/student-notes?student_id=xxx
export async function GET(req: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const studentId = new URL(req.url).searchParams.get('student_id')
  if (!studentId) return NextResponse.json({ error: 'Missing student_id' }, { status: 400 })

  const { data } = await supabase
    .from('coach_student_notes')
    .select('content, updated_at')
    .eq('coach_id', user.id)
    .eq('student_id', studentId)
    .maybeSingle()

  return NextResponse.json({ content: data?.content ?? '', updated_at: data?.updated_at ?? null })
}

// PUT /api/coach/student-notes — { student_id, content }
export async function PUT(req: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const body = await req.json()
  const { student_id, content } = body as { student_id?: string; content?: string }
  if (!student_id) return NextResponse.json({ error: 'Missing student_id' }, { status: 400 })

  const { error } = await supabase
    .from('coach_student_notes')
    .upsert(
      { coach_id: user.id, student_id, content: content ?? '', updated_at: new Date().toISOString() },
      { onConflict: 'coach_id,student_id' },
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
