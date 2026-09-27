import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/assert-admin'

const PROJECT_ID = 'puhflkdcvwoektzlktqh'

// ============================================================
// OnlyPok — Durcissement RLS (audit sécurité 2026-07-26)
// Referme les failles critiques d'accès direct via la clé anon
// publique (navigateur -> PostgREST). Idempotent : réexécutable.
// À lancer une fois : GET /api/migrate/security-rls (admin),
// ou copier `sql` dans Supabase > SQL Editor.
// ============================================================
// Recopie exacte de sql/security-rls.sql (source de vérité).
const SQL = `
-- =====================================================================
-- OnlyPok — Durcissement RLS (audit sécurité 2026-07-26)
-- À exécuter UNE FOIS dans Supabase > SQL Editor > Run.
-- Idempotent : réexécutable sans risque. Tout-ou-rien (transaction).
-- Source de vérité : ce fichier (recopié dans app/api/migrate/security-rls).
-- Révisé le 2026-09-26 : colonnes privées de profiles réellement masquées,
-- is_pro retiré du trigger (auto-déclaratif), tables optionnelles gardées.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- profiles : lignes lisibles par tous (profils coachs, pseudos élèves),
-- mais SEULES les colonnes publiques sont lisibles via anon/authenticated.
-- Les données perso (email, téléphone, adresse, SIRET, IBAN…) ne sont
-- lisibles que par leur propriétaire via get_my_profile(), ou côté serveur
-- (service-role). Écriture sur sa propre ligne, jamais d'auto-promotion admin.
--
-- ⚠️ Une NOUVELLE colonne de profiles n'est lisible côté client qu'après
-- l'avoir ajoutée au GRANT ci-dessous (publique) ou à get_my_profile (privée).
-- ---------------------------------------------------------------------
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_select_all" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_select_all" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION protect_privileged_profile_columns()
RETURNS TRIGGER AS $
BEGIN
  -- service_role / migrations : autorisés
  IF current_user IN ('service_role', 'supabase_admin', 'postgres', 'supabase_auth_admin') THEN
    RETURN NEW;
  END IF;
  -- Personne ne s'auto-attribue le rôle admin depuis le client.
  -- (is_pro n'est PAS protégé : c'est la réponse auto-déclarée « je vis du
  --  poker » de l'onboarding ; le badge « vérifié » vient de coach_proofs.)
  IF NEW.role = 'admin' AND (TG_OP = 'INSERT' OR OLD.role IS DISTINCT FROM 'admin') THEN
    RAISE EXCEPTION 'Attribution du rôle admin interdite';
  END IF;
  RETURN NEW;
END;
$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_profile_privs ON profiles;
CREATE TRIGGER trg_protect_profile_privs
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION protect_privileged_profile_columns();

-- Masquage par colonne. Un REVOKE de colonnes seul serait SANS EFFET tant
-- que le SELECT au niveau table existe : on retire donc le droit table,
-- puis on ré-accorde uniquement les colonnes publiques.
REVOKE SELECT ON profiles FROM anon, authenticated;
GRANT SELECT (
  id, username, role, bio, xp, created_at, onboarding_completed,
  years_experience, is_pro, rooms, variants, advantages, coaching_mode,
  hourly_rate, weekend_rate_pct, coaching_packages, coaching_packs, country,
  target_players, avatar_url, vision, co_coach_ids, cal_url, privacy_prefs
) ON profiles TO anon, authenticated;

-- Son propre profil complet (colonnes privées incluses). Les coordonnées de
-- paiement restent vides ici : elles ne transitent que chiffrées/déchiffrées
-- par /api/coach/payment-info (service-role).
CREATE OR REPLACE FUNCTION get_my_profile()
RETURNS SETOF profiles
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $
DECLARE r profiles%ROWTYPE;
BEGIN
  SELECT * INTO r FROM profiles WHERE id = auth.uid();
  IF NOT FOUND THEN RETURN; END IF;
  r.iban := NULL; r.paypal_email := NULL; r.stripe_account := NULL;
  r.revolut_tag := NULL; r.payment_notes := NULL;
  RETURN NEXT r;
END;
$;
REVOKE ALL ON FUNCTION get_my_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_my_profile() TO authenticated;

-- ---------------------------------------------------------------------
-- formations : lecture publique si publiée (ou propriétaire/admin),
-- création réservée aux coachs, édition/suppression au propriétaire.
-- ---------------------------------------------------------------------
ALTER TABLE formations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "formations_select" ON formations;
DROP POLICY IF EXISTS "formations_insert_coach" ON formations;
DROP POLICY IF EXISTS "formations_update_own" ON formations;
DROP POLICY IF EXISTS "formations_delete_own" ON formations;
CREATE POLICY "formations_select" ON formations FOR SELECT USING (
  COALESCE(published, false) = true
  OR auth.uid() = coach_id
  OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);
CREATE POLICY "formations_insert_coach" ON formations FOR INSERT WITH CHECK (
  auth.uid() = coach_id
  AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('coach', 'admin'))
);
CREATE POLICY "formations_update_own" ON formations FOR UPDATE
  USING (auth.uid() = coach_id) WITH CHECK (auth.uid() = coach_id);
CREATE POLICY "formations_delete_own" ON formations FOR DELETE USING (auth.uid() = coach_id);

-- ---------------------------------------------------------------------
-- formation_chapters : titres visibles publiquement (aperçu du cursus),
-- écriture réservée au coach propriétaire de la formation.
-- ---------------------------------------------------------------------
ALTER TABLE formation_chapters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "chapters_select" ON formation_chapters;
DROP POLICY IF EXISTS "chapters_write_owner" ON formation_chapters;
CREATE POLICY "chapters_select" ON formation_chapters FOR SELECT USING (true);
CREATE POLICY "chapters_write_owner" ON formation_chapters FOR ALL USING (
  EXISTS (SELECT 1 FROM formations f WHERE f.id = formation_chapters.formation_id AND f.coach_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM formations f WHERE f.id = formation_chapters.formation_id AND f.coach_id = auth.uid())
);

-- ---------------------------------------------------------------------
-- formation_lessons : une leçon payante VERROUILLÉE est totalement
-- invisible tant que l'utilisateur n'a pas acheté (sa video_url ne fuit
-- donc jamais, ni en SSR ni via un appel PostgREST direct à la clé anon).
-- Visible si : leçon gratuite, OU formation gratuite, OU achat, OU coach
-- propriétaire, OU admin. Les leçons gratuites servent d'aperçu.
-- ---------------------------------------------------------------------
ALTER TABLE formation_lessons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lessons_select" ON formation_lessons;
DROP POLICY IF EXISTS "lessons_write_owner" ON formation_lessons;
CREATE POLICY "lessons_select" ON formation_lessons FOR SELECT USING (
  is_free = true
  OR EXISTS (
    SELECT 1 FROM formation_chapters c
    JOIN formation_purchases fp ON fp.formation_id = c.formation_id
    WHERE c.id = formation_lessons.chapter_id AND fp.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM formation_chapters c
    JOIN formations f ON f.id = c.formation_id
    WHERE c.id = formation_lessons.chapter_id AND (f.coach_id = auth.uid() OR COALESCE(f.price, 0) = 0)
  )
  OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);
CREATE POLICY "lessons_write_owner" ON formation_lessons FOR ALL USING (
  EXISTS (
    SELECT 1 FROM formation_chapters c
    JOIN formations f ON f.id = c.formation_id
    WHERE c.id = formation_lessons.chapter_id AND f.coach_id = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM formation_chapters c
    JOIN formations f ON f.id = c.formation_id
    WHERE c.id = formation_lessons.chapter_id AND f.coach_id = auth.uid()
  )
);
-- NOTE (résiduel connu) : pour les formations de type "video" (une seule
-- vidéo au niveau formations.video_url), la vidéo reste lisible par un
-- utilisateur authentifié. À traiter par une route serveur signée dédiée.

-- ---------------------------------------------------------------------
-- formation_purchases : preuve d'achat. Lecture par l'acheteur (ou le
-- coach de la formation). AUCUNE écriture client : seul le webhook Stripe
-- / verify-session (service-role) crée une ligne.
-- ---------------------------------------------------------------------
ALTER TABLE formation_purchases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "purchases_select_own" ON formation_purchases;
CREATE POLICY "purchases_select_own" ON formation_purchases FOR SELECT USING (
  auth.uid() = user_id
  OR EXISTS (SELECT 1 FROM formations f WHERE f.id = formation_purchases.formation_id AND f.coach_id = auth.uid())
);
-- (pas de policy INSERT/UPDATE/DELETE => interdit à anon/authenticated,
--  autorisé uniquement au service-role qui bypass la RLS)

-- ---------------------------------------------------------------------
-- formation_progress : chacun gère sa propre progression.
-- ---------------------------------------------------------------------
ALTER TABLE formation_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "progress_all_own" ON formation_progress;
CREATE POLICY "progress_all_own" ON formation_progress FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- reviews : un avis exige un achat de formation OU une session de
-- coaching avec ce coach. Un seul avis par (élève, coach, type).
-- ---------------------------------------------------------------------
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "reviews_select_all" ON reviews;
DROP POLICY IF EXISTS "reviews_insert_verified" ON reviews;
DROP POLICY IF EXISTS "reviews_update_own" ON reviews;
DROP POLICY IF EXISTS "reviews_delete_own" ON reviews;
CREATE POLICY "reviews_select_all" ON reviews FOR SELECT USING (true);
CREATE POLICY "reviews_insert_verified" ON reviews FOR INSERT WITH CHECK (
  auth.uid() = student_id
  AND (
    EXISTS (
      SELECT 1 FROM formation_purchases fp
      JOIN formations f ON f.id = fp.formation_id
      WHERE fp.user_id = auth.uid() AND f.coach_id = reviews.coach_id
    )
    OR EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.student_id = auth.uid() AND b.coach_id = reviews.coach_id
    )
  )
);
CREATE POLICY "reviews_update_own" ON reviews FOR UPDATE
  USING (auth.uid() = student_id) WITH CHECK (auth.uid() = student_id);
CREATE POLICY "reviews_delete_own" ON reviews FOR DELETE USING (auth.uid() = student_id);

-- Un seul avis par élève/coach/type (ignore si des doublons existent déjà)
DO $
BEGIN
  BEGIN
    CREATE UNIQUE INDEX IF NOT EXISTS reviews_unique_student_coach_type
      ON reviews(student_id, coach_id, content_type);
  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'Doublons d''avis existants : contrainte unique non posée, à nettoyer manuellement.';
  END;
END $;

-- ---------------------------------------------------------------------
-- notifications : chacun lit/modifie les siennes. Création uniquement
-- côté serveur (service-role) : pas de fausses notifs de phishing.
-- ---------------------------------------------------------------------
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notif_select_own" ON notifications;
DROP POLICY IF EXISTS "notif_update_own" ON notifications;
DROP POLICY IF EXISTS "notif_delete_own" ON notifications;
CREATE POLICY "notif_select_own" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notif_update_own" ON notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "notif_delete_own" ON notifications FOR DELETE USING (auth.uid() = user_id);
-- (pas de policy INSERT => réservé au service-role)

-- ---------------------------------------------------------------------
-- coach_proofs : preuves de gains. Visibles si validées (ou au coach).
-- Le coach NE PEUT PAS s'auto-valider : validation_status/rejection/
-- reviewed_at ne changent que via le service-role (/api/admin/proofs).
-- ---------------------------------------------------------------------
ALTER TABLE coach_proofs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "proofs_select" ON coach_proofs;
DROP POLICY IF EXISTS "proofs_insert_own" ON coach_proofs;
DROP POLICY IF EXISTS "proofs_update_own" ON coach_proofs;
DROP POLICY IF EXISTS "proofs_delete_own" ON coach_proofs;
CREATE POLICY "proofs_select" ON coach_proofs FOR SELECT USING (
  validation_status = 'approved' OR auth.uid() = coach_id
);
CREATE POLICY "proofs_insert_own" ON coach_proofs FOR INSERT WITH CHECK (auth.uid() = coach_id);
CREATE POLICY "proofs_update_own" ON coach_proofs FOR UPDATE
  USING (auth.uid() = coach_id) WITH CHECK (auth.uid() = coach_id);
CREATE POLICY "proofs_delete_own" ON coach_proofs FOR DELETE USING (auth.uid() = coach_id);

CREATE OR REPLACE FUNCTION protect_proof_validation()
RETURNS TRIGGER AS $
BEGIN
  IF current_user IN ('service_role', 'supabase_admin', 'postgres') THEN
    RETURN NEW;
  END IF;
  IF NEW.validation_status IS DISTINCT FROM OLD.validation_status
     OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at
     OR NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason THEN
    RAISE EXCEPTION 'La validation d''une preuve ne peut être modifiée que par un administrateur';
  END IF;
  RETURN NEW;
END;
$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_proof_validation ON coach_proofs;
CREATE TRIGGER trg_protect_proof_validation
  BEFORE UPDATE ON coach_proofs
  FOR EACH ROW EXECUTE FUNCTION protect_proof_validation();

-- Force le statut "pending" à l'insertion depuis le client
CREATE OR REPLACE FUNCTION force_proof_pending_on_insert()
RETURNS TRIGGER AS $
BEGIN
  IF current_user NOT IN ('service_role', 'supabase_admin', 'postgres') THEN
    NEW.validation_status := 'pending';
    NEW.reviewed_at := NULL;
    NEW.rejection_reason := NULL;
  END IF;
  RETURN NEW;
END;
$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_force_proof_pending ON coach_proofs;
CREATE TRIGGER trg_force_proof_pending
  BEFORE INSERT ON coach_proofs
  FOR EACH ROW EXECUTE FUNCTION force_proof_pending_on_insert();

-- ---------------------------------------------------------------------
-- video_comments : visibles/écrits uniquement par les deux participants.
-- ---------------------------------------------------------------------
DO $
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'video_comments') THEN
    EXECUTE 'ALTER TABLE video_comments ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "vc_select_part" ON video_comments';
    EXECUTE 'DROP POLICY IF EXISTS "vc_insert_part" ON video_comments';
    EXECUTE 'CREATE POLICY "vc_select_part" ON video_comments FOR SELECT USING (auth.uid() = coach_id OR auth.uid() = student_id)';
    EXECUTE 'CREATE POLICY "vc_insert_part" ON video_comments FOR INSERT WITH CHECK (auth.uid() = student_id OR auth.uid() = coach_id)';
  END IF;
END $;

-- ---------------------------------------------------------------------
-- coach_student_notes : notes privées du coach (RLS était en commentaire
-- dans /api/coach/student-notes, jamais appliquée).
-- ---------------------------------------------------------------------
DO $
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'coach_student_notes') THEN
    EXECUTE 'ALTER TABLE coach_student_notes ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "csn_all_own" ON coach_student_notes';
    EXECUTE 'CREATE POLICY "csn_all_own" ON coach_student_notes FOR ALL USING (auth.uid() = coach_id) WITH CHECK (auth.uid() = coach_id)';
  END IF;
END $;

-- ---------------------------------------------------------------------
-- bookings : lecture seule côté client, toute écriture passe par le
-- service-role (lib/bookings.ts, /api/bookings/*). Un élève ne crée plus de
-- session « payée » à 0 € ni ne modifie statut/prix via PostgREST.
-- (voir aussi sql/security-rls-bookings.sql qui purge les policies résiduelles)
-- ---------------------------------------------------------------------
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bookings_insert_own" ON bookings;
DROP POLICY IF EXISTS "bookings_update_own" ON bookings;
DROP POLICY IF EXISTS "bookings_select_own" ON bookings;
CREATE POLICY "bookings_select_own" ON bookings FOR SELECT
  USING (auth.uid() = student_id OR auth.uid() = coach_id);

-- ---------------------------------------------------------------------
-- Storage : restreint types MIME + taille AU NIVEAU DES BUCKETS. Bloque
-- l'upload d'un .html/.svg déguisé quel que soit le chemin (y compris les
-- uploads directs client -> storage qui ne passent pas par une route serveur).
-- No-op si un bucket n'existe pas.
-- ---------------------------------------------------------------------
UPDATE storage.buckets
  SET allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/gif'],
      file_size_limit = 5242880
  WHERE id IN ('avatars', 'formations-thumbnails', 'coach-proofs');

UPDATE storage.buckets
  SET allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/gif','application/pdf'],
      file_size_limit = 10485760
  WHERE id = 'message-attachments';

COMMIT;
`

export async function GET() {
  if (!await assertAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const mgmtToken = process.env.SUPABASE_MANAGEMENT_TOKEN
  if (!mgmtToken) {
    return NextResponse.json({
      message: 'Pas de SUPABASE_MANAGEMENT_TOKEN. Exécute ce SQL manuellement dans Supabase > SQL Editor :',
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
    return NextResponse.json({ error: 'Migration RLS échouée', detail: json }, { status: 500 })
  }

  return NextResponse.json({ success: true, message: 'RLS durcie ✓' })
}
