-- ==========================================
-- 16. LECTURE DE L'HISTORIQUE DES SIGNALEMENTS
-- ==========================================

ALTER TABLE public.report_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lecture publique de l'historique des signalements" ON public.report_history;
CREATE POLICY "Lecture publique de l'historique des signalements" ON public.report_history
FOR SELECT
TO anon, authenticated
USING (true);
