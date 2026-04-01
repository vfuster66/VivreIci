-- ==========================================
-- 17. INSERTION DANS L'HISTORIQUE DES SIGNALEMENTS
-- ==========================================

DROP POLICY IF EXISTS "Insertion publique de l'historique des signalements" ON public.report_history;
CREATE POLICY "Insertion publique de l'historique des signalements" ON public.report_history
FOR INSERT
TO anon, authenticated
WITH CHECK (true);
