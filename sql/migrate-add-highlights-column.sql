-- Extrait de app/api/migrate/add-highlights-column/route.ts (constante SQL), déjà exécuté le cas échéant.
-- Conservé pour l'historique : vérifier l'état de la base avant toute réexécution.

ALTER TABLE formations ADD COLUMN IF NOT EXISTS highlights jsonb DEFAULT NULL;
