-- Extrait de app/api/migrate/fix-variant-constraint/route.ts (FULL_SQL = VARIANT_SQL + COMMENTS_SQL), déjà exécuté le cas échéant.
-- Conservé pour l'historique : vérifier l'état de la base avant toute réexécution.

ALTER TABLE formations DROP CONSTRAINT IF EXISTS formations_variant_check;
ALTER TABLE formations ADD CONSTRAINT formations_variant_check
  CHECK (variant IN ('MTT', 'NLH', 'Cash', 'Expresso', 'PLO', 'SNG', 'Heads-Up', 'PKO', 'Autre'));

ALTER TABLE video_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "vc_select" ON video_comments;
DROP POLICY IF EXISTS "vc_insert" ON video_comments;
DROP POLICY IF EXISTS "vc_delete" ON video_comments;
CREATE POLICY "vc_select" ON video_comments FOR SELECT USING (true);
CREATE POLICY "vc_insert" ON video_comments FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "vc_delete" ON video_comments FOR DELETE USING (auth.uid() = student_id OR auth.uid() = coach_id);
