import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/assert-admin'

const PROJECT_ID = 'puhflkdcvwoektzlktqh'

const SQL = `
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS avatar_url        TEXT,
  ADD COLUMN IF NOT EXISTS first_name        TEXT,
  ADD COLUMN IF NOT EXISTS last_name         TEXT,
  ADD COLUMN IF NOT EXISTS full_name         TEXT,
  ADD COLUMN IF NOT EXISTS birth_date        DATE,
  ADD COLUMN IF NOT EXISTS marketing_opt_out BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS target_players    TEXT[]  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS bio               TEXT,
  ADD COLUMN IF NOT EXISTS vision            TEXT,
  ADD COLUMN IF NOT EXISTS cal_url           TEXT,
  ADD COLUMN IF NOT EXISTS years_experience  INTEGER,
  ADD COLUMN IF NOT EXISTS is_pro            BOOLEAN,
  ADD COLUMN IF NOT EXISTS rooms             TEXT[]  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS variants          TEXT[]  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS advantages        TEXT[]  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS coaching_mode     TEXT,
  ADD COLUMN IF NOT EXISTS hourly_rate       INTEGER,
  ADD COLUMN IF NOT EXISTS weekend_rate_pct  INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS coaching_packages JSONB   DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS phone             TEXT,
  ADD COLUMN IF NOT EXISTS address_line      TEXT,
  ADD COLUMN IF NOT EXISTS city              TEXT,
  ADD COLUMN IF NOT EXISTS zip_code          TEXT,
  ADD COLUMN IF NOT EXISTS country           TEXT    DEFAULT 'France',
  ADD COLUMN IF NOT EXISTS is_company        BOOLEAN,
  ADD COLUMN IF NOT EXISTS company_name      TEXT,
  ADD COLUMN IF NOT EXISTS siret             TEXT,
  ADD COLUMN IF NOT EXISTS vat_number        TEXT,
  ADD COLUMN IF NOT EXISTS iban              TEXT,
  ADD COLUMN IF NOT EXISTS paypal_email      TEXT,
  ADD COLUMN IF NOT EXISTS stripe_account    TEXT,
  ADD COLUMN IF NOT EXISTS revolut_tag       TEXT,
  ADD COLUMN IF NOT EXISTS payment_notes     TEXT,
  ADD COLUMN IF NOT EXISTS co_coach_ids      TEXT[]  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS coaching_packs    JSONB   DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS preferred_payment    TEXT,
  ADD COLUMN IF NOT EXISTS notification_prefs  JSONB   DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS privacy_prefs       JSONB   DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS language            TEXT    DEFAULT 'fr';

CREATE TABLE IF NOT EXISTS formation_chapters (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  formation_id UUID REFERENCES formations(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  order_index  INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS formation_lessons (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id   UUID REFERENCES formation_chapters(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  video_url    TEXT,
  video_type   TEXT DEFAULT 'youtube',
  is_free      BOOLEAN DEFAULT false,
  order_index  INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS formation_purchases (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  formation_id UUID REFERENCES formations(id) ON DELETE CASCADE,
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE(formation_id, user_id)
);

CREATE TABLE IF NOT EXISTS formation_progress (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  formation_id UUID REFERENCES formations(id) ON DELETE CASCADE,
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id    UUID REFERENCES formation_lessons(id) ON DELETE CASCADE,
  completed    BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE(lesson_id, user_id)
);

CREATE TABLE IF NOT EXISTS reviews (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  rating           INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment          TEXT,
  category_ratings JSONB DEFAULT '{}',
  content_type     TEXT DEFAULT 'formation',
  created_at       TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS video_comments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  formation_id UUID,
  video_url    TEXT,
  coach_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id   UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content      TEXT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tracker_sessions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date       DATE NOT NULL DEFAULT CURRENT_DATE,
  stakes     TEXT,
  variant    TEXT DEFAULT 'NLH',
  location   TEXT DEFAULT 'online',
  buy_in     INTEGER NOT NULL DEFAULT 0,
  cash_out   INTEGER NOT NULL DEFAULT 0,
  duration   INTEGER,
  notes      TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tracker_sessions_user_idx ON tracker_sessions(user_id);

CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT,
  read       BOOLEAN DEFAULT false,
  data       JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_idx  ON notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_unread_idx ON notifications(user_id, read);

CREATE TABLE IF NOT EXISTS tournament_results (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tournament_id   TEXT NOT NULL,
  tournament_name TEXT NOT NULL,
  room            TEXT DEFAULT 'winamax',
  date            DATE NOT NULL,
  buy_in_prize    NUMERIC(10,2) DEFAULT 0,
  buy_in_bounty   NUMERIC(10,2) DEFAULT 0,
  buy_in_rake     NUMERIC(10,2) DEFAULT 0,
  buy_in_total    NUMERIC(10,2) DEFAULT 0,
  placement       INTEGER,
  total_players   INTEGER,
  prize_pool      NUMERIC(10,2) DEFAULT 0,
  prize_won       NUMERIC(10,2) DEFAULT 0,
  bounties_won    NUMERIC(10,2) DEFAULT 0,
  net_profit      NUMERIC(10,2) DEFAULT 0,
  duration_secs   INTEGER DEFAULT 0,
  hands_played    INTEGER DEFAULT 0,
  vpip_pct        NUMERIC(5,2),
  pfr_pct         NUMERIC(5,2),
  three_bet_pct   NUMERIC(5,2),
  type            TEXT DEFAULT 'tournament',
  speed           TEXT,
  hero_name       TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, tournament_id)
);
CREATE INDEX IF NOT EXISTS tournament_results_user_idx ON tournament_results(user_id);
CREATE INDEX IF NOT EXISTS tournament_results_date_idx ON tournament_results(user_id, date DESC);

-- Colonnes ajoutées après création initiale (idempotent)
ALTER TABLE tournament_results
  ADD COLUMN IF NOT EXISTS prize_won    NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bounties_won NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_profit   NUMERIC(10,2) DEFAULT 0;

-- RLS tournament_results
ALTER TABLE tournament_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tr_select_own" ON tournament_results;
DROP POLICY IF EXISTS "tr_insert_own" ON tournament_results;
DROP POLICY IF EXISTS "tr_update_own" ON tournament_results;
CREATE POLICY "tr_select_own" ON tournament_results FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "tr_insert_own" ON tournament_results FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tr_update_own" ON tournament_results FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- RLS tracker_sessions
ALTER TABLE tracker_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ts_select_own" ON tracker_sessions;
DROP POLICY IF EXISTS "ts_insert_own" ON tracker_sessions;
DROP POLICY IF EXISTS "ts_update_own" ON tracker_sessions;
DROP POLICY IF EXISTS "ts_delete_own" ON tracker_sessions;
CREATE POLICY "ts_select_own" ON tracker_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ts_insert_own" ON tracker_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ts_update_own" ON tracker_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "ts_delete_own" ON tracker_sessions FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS coach_proofs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id          UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  url               TEXT NOT NULL,
  caption           TEXT DEFAULT '',
  category          TEXT DEFAULT 'longterme',
  order_index       INTEGER DEFAULT 0,
  validation_status TEXT DEFAULT 'pending',
  rejection_reason  TEXT,
  reviewed_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE coach_proofs
  ADD COLUMN IF NOT EXISTS validation_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS rejection_reason  TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_at       TIMESTAMPTZ;

-- Photos complémentaires par offre de coaching
ALTER TABLE formations
  ADD COLUMN IF NOT EXISTS gallery_urls JSONB DEFAULT '[]';

-- Disponibilités des coachs (plages horaires hebdomadaires)
CREATE TABLE IF NOT EXISTS availabilities (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  slot        TEXT NOT NULL,
  booked      BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(coach_id, day_of_week, slot)
);
CREATE INDEX IF NOT EXISTS availabilities_coach_idx ON availabilities(coach_id);

ALTER TABLE availabilities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "avail_select_all"   ON availabilities;
DROP POLICY IF EXISTS "avail_insert_own"   ON availabilities;
DROP POLICY IF EXISTS "avail_update_own"   ON availabilities;
DROP POLICY IF EXISTS "avail_delete_own"   ON availabilities;
CREATE POLICY "avail_select_all" ON availabilities FOR SELECT USING (true);
CREATE POLICY "avail_insert_own" ON availabilities FOR INSERT WITH CHECK (auth.uid() = coach_id);
CREATE POLICY "avail_update_own" ON availabilities FOR UPDATE USING (auth.uid() = coach_id);
CREATE POLICY "avail_delete_own" ON availabilities FOR DELETE USING (auth.uid() = coach_id);

-- Sessions de coaching réservées
CREATE TABLE IF NOT EXISTS bookings (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  formation_id             UUID REFERENCES formations(id) ON DELETE CASCADE,
  student_id               UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  coach_id                 UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  pack_index               INTEGER,
  status                   TEXT DEFAULT 'paid_pending_schedule',
  scheduled_at             TIMESTAMPTZ,
  stripe_session_id        TEXT,
  stripe_payment_intent_id TEXT,
  created_at               TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS bookings_student_idx ON bookings(student_id);
CREATE INDEX IF NOT EXISTS bookings_coach_idx   ON bookings(coach_id);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bookings_select_own" ON bookings;
DROP POLICY IF EXISTS "bookings_insert_own" ON bookings;
DROP POLICY IF EXISTS "bookings_update_own" ON bookings;
CREATE POLICY "bookings_select_own" ON bookings FOR SELECT USING (auth.uid() = student_id OR auth.uid() = coach_id);
CREATE POLICY "bookings_insert_own" ON bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "bookings_update_own" ON bookings FOR UPDATE USING (auth.uid() = student_id OR auth.uid() = coach_id);

-- Progression vidéo (watch time par leçon)
CREATE TABLE IF NOT EXISTS video_progress (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id        UUID REFERENCES formation_lessons(id) ON DELETE CASCADE,
  formation_id     UUID REFERENCES formations(id) ON DELETE CASCADE,
  watched_seconds  INTEGER DEFAULT 0,
  duration_seconds INTEGER DEFAULT 0,
  updated_at       TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);
CREATE INDEX IF NOT EXISTS video_progress_user_idx ON video_progress(user_id);

ALTER TABLE video_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "vp_select_own" ON video_progress;
DROP POLICY IF EXISTS "vp_upsert_own" ON video_progress;
CREATE POLICY "vp_select_own" ON video_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "vp_upsert_own" ON video_progress FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Colonnes bookings ajoutées progressivement (idempotent)
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS pack_index               INTEGER,
  ADD COLUMN IF NOT EXISTS stripe_session_id        TEXT,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
  ADD COLUMN IF NOT EXISTS meeting_url              TEXT,
  ADD COLUMN IF NOT EXISTS coach_feedback           TEXT,
  ADD COLUMN IF NOT EXISTS feedback_at              TIMESTAMPTZ;

-- messages coach <-> étudiant
CREATE TABLE IF NOT EXISTS messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  to_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  read       BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS messages_from_idx ON messages(from_id);
CREATE INDEX IF NOT EXISTS messages_to_idx   ON messages(to_id);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "messages_select_own" ON messages;
DROP POLICY IF EXISTS "messages_insert_own" ON messages;
DROP POLICY IF EXISTS "messages_update_own" ON messages;
CREATE POLICY "messages_select_own" ON messages FOR SELECT USING (auth.uid() = from_id OR auth.uid() = to_id);
CREATE POLICY "messages_insert_own" ON messages FOR INSERT WITH CHECK (auth.uid() = from_id);
CREATE POLICY "messages_update_own" ON messages FOR UPDATE USING (auth.uid() = to_id);
`

export async function GET() {
  if (!await assertAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const mgmtToken = process.env.SUPABASE_MANAGEMENT_TOKEN
  if (!mgmtToken) {
    return NextResponse.json({
      message: 'Pas de SUPABASE_MANAGEMENT_TOKEN. Exécute ce SQL manuellement dans Supabase SQL Editor :',
      sql: SQL,
    }, { status: 200 })
  }

  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_ID}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${mgmtToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: SQL }),
  })

  const json = await res.json()
  if (!res.ok) {
    return NextResponse.json({ error: json }, { status: 500 })
  }

  return NextResponse.json({ success: true, result: json })
}
