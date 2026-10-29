-- =====================================================================
-- OnlyPok — Suppression du tarif week-end (2026-10-21)
-- La fonctionnalité a été retirée du code : la colonne n'est plus lue
-- ni écrite nulle part. À exécuter dans Supabase > SQL Editor > Run.
-- Idempotent. Le GRANT de colonne sur profiles disparaît avec la colonne.
-- =====================================================================
ALTER TABLE profiles DROP COLUMN IF EXISTS weekend_rate_pct;
