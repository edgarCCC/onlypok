import { NextResponse } from 'next/server'

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
`

export async function GET() {
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
