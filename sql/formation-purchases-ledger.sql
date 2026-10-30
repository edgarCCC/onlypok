-- =====================================================================
-- OnlyPok — R10 : formation_purchases devient un REGISTRE (2026-10-29)
-- Une ligne par paiement Stripe, clé unique stripe_session_id.
-- À exécuter dans Supabase > SQL Editor. Idempotent. Tout-ou-rien.
--
-- ORDRE D'EXÉCUTION
--   1. Déployer d'abord le code du sprint S1 (lib/purchases.ts,
--      /api/stripe/checkout, learn/page.tsx) ET la correction de
--      app/(student)/formations/[id]/page.tsx (l. 112-113, `.single()`
--      → `.limit(1)`), sinon un élève qui a racheté un coaching apparaîtra
--      « non acheté » sur la page du coaching (`.single()` échoue dès qu'il
--      y a 2 lignes). Le code S1 fonctionne AVANT comme APRÈS ce SQL.
--   2. CE FICHIER.
--   3. sql/security-rls-reviews.sql (R12) peut passer avant ou après.
--
-- POURQUOI
--   UNIQUE(formation_id, user_id) : un second achat de coaching par le même
--   élève écrasait le montant du premier (upsert « dernier gagnant »).
--   Revenus et reversements coach faux.
--
-- CE QUI CHANGE
--   - Nouvelle colonne stripe_session_id + contrainte UNIQUE (les lignes
--     historiques restent à NULL : plusieurs NULL sont autorisés).
--   - Suppression de la contrainte UNIQUE(formation_id, user_id).
--   - Index non uniques pour garder des lectures rapides (hasPurchased,
--     policy lessons_select, espace coach).
--   - Rattachement des lignes historiques de coaching à leur session Stripe
--     quand c'est sans ambiguïté (via le booking « ancre » du paiement).
--
-- POLICIES RLS REVÉRIFIÉES (aucune modification nécessaire ici)
--   - formation_lessons.lessons_select : EXISTS (... formation_purchases ...)
--     → vrai dès qu'une ligne existe, correct avec N lignes.
--   - formation_purchases.purchases_select_own : par ligne, correct.
--   - reviews.reviews_insert_verified : EXISTS, correct avec N lignes
--     (et durcie séparément par security-rls-reviews.sql).
--   - Aucune écriture client : seul le service-role écrit (inchangé).
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1. Colonnes
--    Les colonnes de montant existent déjà en prod (écrites par le code) ;
--    les ADD ... IF NOT EXISTS ne modifient pas une colonne existante.
-- ---------------------------------------------------------------------
ALTER TABLE public.formation_purchases
  ADD COLUMN IF NOT EXISTS stripe_session_id TEXT,
  ADD COLUMN IF NOT EXISTS amount_paid       NUMERIC,
  ADD COLUMN IF NOT EXISTS net_amount        NUMERIC,
  ADD COLUMN IF NOT EXISTS platform_fee_pct  NUMERIC;

-- ---------------------------------------------------------------------
-- 2. Clé unique du registre : une ligne par session Stripe
--    (contrainte et non index partiel : l'upsert/ON CONFLICT de PostgREST
--    doit pouvoir l'inférer).
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.formation_purchases'::regclass
      AND conname  = 'formation_purchases_stripe_session_id_key'
  ) THEN
    ALTER TABLE public.formation_purchases
      ADD CONSTRAINT formation_purchases_stripe_session_id_key UNIQUE (stripe_session_id);
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 3. Suppression de l'unicité (formation_id, user_id)
--    Le nom exact de la contrainte n'est pas garanti (créée hors
--    migrations) : on la retrouve par ses colonnes. Couvre aussi le cas
--    d'un index unique « nu » sur ces deux colonnes.
-- ---------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    WHERE c.conrelid = 'public.formation_purchases'::regclass
      AND c.contype  = 'u'
      AND (
        SELECT array_agg(a.attname::text ORDER BY a.attname)
        FROM unnest(c.conkey) k
        JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k
      ) = ARRAY['formation_id', 'user_id']
  LOOP
    RAISE NOTICE 'Suppression contrainte unique : %', r.conname;
    EXECUTE format('ALTER TABLE public.formation_purchases DROP CONSTRAINT %I', r.conname);
  END LOOP;

  FOR r IN
    SELECT i.indexrelid::regclass::text AS idx
    FROM pg_index i
    WHERE i.indrelid = 'public.formation_purchases'::regclass
      AND i.indisunique AND NOT i.indisprimary
      AND NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conindid = i.indexrelid)
      AND (
        SELECT array_agg(a.attname::text ORDER BY a.attname)
        FROM unnest(i.indkey) k
        JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k
      ) = ARRAY['formation_id', 'user_id']
  LOOP
    RAISE NOTICE 'Suppression index unique : %', r.idx;
    EXECUTE format('DROP INDEX %s', r.idx);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- 4. Index de lecture (remplacent l'index implicite de l'ancienne unicité)
--    - (user_id, formation_id) : hasPurchased, policy lessons_select,
--      listes « mes achats » de l'élève (user_id en tête).
--    - (formation_id, created_at DESC) : espace coach (/api/coach/purchases,
--      /api/coach/students : .in(formation_id).order(created_at)).
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS formation_purchases_user_formation_idx
  ON public.formation_purchases (user_id, formation_id);
CREATE INDEX IF NOT EXISTS formation_purchases_formation_created_idx
  ON public.formation_purchases (formation_id, created_at DESC);

-- ---------------------------------------------------------------------
-- 5. Rattachement des lignes historiques de COACHING à leur session
--    Stripe, uniquement quand il n'y a qu'UN paiement (booking ancre)
--    pour ce couple (formation, élève) : aucune ambiguïté possible.
--    Booking ancre = 1re séance d'un paiement : stripe_session_id sans
--    suffixe « _<n> » (les séances 2..n d'un pack ont « <session>_<n> »).
--    Sert l'idempotence : un rejeu webhook / un rechargement de l'URL de
--    succès d'une ancienne session ne créera pas de seconde ligne.
--    Les formations / vidéos n'ont pas de session en base : le code
--    (lib/purchases.ts) rattache leur ligne historique à la volée.
-- ---------------------------------------------------------------------
WITH anchors AS (
  SELECT b.formation_id, b.student_id, min(b.stripe_session_id) AS sid, count(*) AS nb
  FROM public.bookings b
  WHERE b.stripe_session_id IS NOT NULL
    AND b.stripe_session_id !~ '_[0-9]+$'
  GROUP BY b.formation_id, b.student_id
)
UPDATE public.formation_purchases fp
   SET stripe_session_id = a.sid
  FROM anchors a
 WHERE fp.stripe_session_id IS NULL
   AND fp.formation_id = a.formation_id
   AND fp.user_id      = a.student_id
   AND a.nb = 1
   AND NOT EXISTS (SELECT 1 FROM public.formation_purchases x WHERE x.stripe_session_id = a.sid);

COMMIT;


-- ---------------------------------------------------------------------
-- 6. VÉRIFICATIONS
-- ---------------------------------------------------------------------
-- a) Contraintes : attendu formation_purchases_stripe_session_id_key,
--    plus AUCUNE contrainte unique sur (formation_id, user_id).
SELECT conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.formation_purchases'::regclass AND contype IN ('u', 'p');

-- b) (lancer seul) Lignes historiques restées sans session — normal pour
--    les formations / vidéos et pour les coachings rachetés plusieurs fois :
-- SELECT fp.id, fp.formation_id, fp.user_id, fp.amount_paid, fp.created_at, f.content_type
-- FROM public.formation_purchases fp JOIN public.formations f ON f.id = fp.formation_id
-- WHERE fp.stripe_session_id IS NULL ORDER BY fp.created_at DESC;

-- c) (lancer seul, information pour R11) Paiements de coaching ÉCRASÉS par
--    l'ancien upsert : booking ancre sans ligne d'achat correspondante.
--    Leur montant est dans bookings.price_paid. NE PAS réinsérer à
--    l'aveugle (séances refusées / remboursées incluses) — à trancher en R11.
-- SELECT b.stripe_session_id, b.formation_id, b.student_id, b.price_paid, b.status, b.created_at
-- FROM public.bookings b
-- WHERE b.stripe_session_id IS NOT NULL AND b.stripe_session_id !~ '_[0-9]+$'
--   AND NOT EXISTS (SELECT 1 FROM public.formation_purchases fp WHERE fp.stripe_session_id = b.stripe_session_id)
-- ORDER BY b.created_at DESC;


-- ---------------------------------------------------------------------
-- RETOUR ARRIÈRE (seulement si aucun 2e achat n'a encore été enregistré,
-- sinon la contrainte (formation_id, user_id) ne pourra pas être reposée) :
-- BEGIN;
--   ALTER TABLE public.formation_purchases DROP CONSTRAINT IF EXISTS formation_purchases_stripe_session_id_key;
--   ALTER TABLE public.formation_purchases ADD CONSTRAINT formation_purchases_formation_id_user_id_key UNIQUE (formation_id, user_id);
-- COMMIT;
-- (le code S1 repasse automatiquement sur l'ancien upsert)
-- ---------------------------------------------------------------------
