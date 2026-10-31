import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NOTE_MAX_LENGTH } from '@/lib/constants'
import { object, optional, readJsonBody, string, uuid } from '@/lib/validate'

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

/* Q11 — PUT : UUID de l'élève, contenu borné à NOTE_MAX_LENGTH (lib/constants.ts,
   même plafond que le textarea de la page messages coach). Corps JSON borné à
   640 Ko en amont : 100 000 caractères × 4 octets UTF-8 au pire + enveloppe. */
const NOTE_MAX_BODY_BYTES = 640 * 1024
const NotesBody = object({ student_id: uuid(), content: optional(string({ max: NOTE_MAX_LENGTH })) })

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

  const body = await readJsonBody(req, NotesBody, { tag: 'coach/student-notes', maxBytes: NOTE_MAX_BODY_BYTES })
  if (!body.ok) return body.response
  const { student_id, content } = body.data

  const { error } = await supabase
    .from('coach_student_notes')
    .upsert(
      { coach_id: user.id, student_id, content: content ?? '', updated_at: new Date().toISOString() },
      { onConflict: 'coach_id,student_id' },
    )

  if (error) {
    // Détail dans les logs seulement, jamais renvoyé au client.
    console.error('[coach/student-notes] upsert failed:', error.message)
    return NextResponse.json({ error: 'Enregistrement de la note impossible.' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
