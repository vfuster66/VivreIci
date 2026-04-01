-- ==========================================
-- 12. TABLE DEDIEE AUX MEDIAS DES SIGNALMENTS
-- ==========================================

CREATE TABLE IF NOT EXISTS public.report_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('image', 'video')),
  url TEXT NOT NULL,
  mime_type TEXT,
  file_size BIGINT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.report_media ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lecture publique des médias de signalement" ON public.report_media;
CREATE POLICY "Lecture publique des médias de signalement" ON public.report_media
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Ajout de ses médias de signalement" ON public.report_media;
CREATE POLICY "Ajout de ses médias de signalement" ON public.report_media
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.reports r
    WHERE r.id = report_id
      AND (
        r.user_id = auth.uid()
        OR public.is_superadmin(auth.uid())
      )
  )
);

DROP POLICY IF EXISTS "Modification de ses médias de signalement" ON public.report_media;
CREATE POLICY "Modification de ses médias de signalement" ON public.report_media
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.reports r
    WHERE r.id = report_id
      AND (
        r.user_id = auth.uid()
        OR public.is_superadmin(auth.uid())
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.reports r
    WHERE r.id = report_id
      AND (
        r.user_id = auth.uid()
        OR public.is_superadmin(auth.uid())
      )
  )
);

DROP POLICY IF EXISTS "Suppression de ses médias de signalement" ON public.report_media;
CREATE POLICY "Suppression de ses médias de signalement" ON public.report_media
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.reports r
    WHERE r.id = report_id
      AND (
        r.user_id = auth.uid()
        OR public.is_superadmin(auth.uid())
      )
  )
);
