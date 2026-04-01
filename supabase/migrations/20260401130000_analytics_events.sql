-- ==========================================
-- 23. ANALYTICS EVENEMENTS PRODUIT
-- ==========================================

CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT NOT NULL,
  page_path TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS analytics_events_created_idx
ON public.analytics_events (created_at DESC);

CREATE INDEX IF NOT EXISTS analytics_events_name_created_idx
ON public.analytics_events (event_name, created_at DESC);

CREATE INDEX IF NOT EXISTS analytics_events_user_created_idx
ON public.analytics_events (user_id, created_at DESC);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lecture analytics réservée aux admins" ON public.analytics_events;
CREATE POLICY "Lecture analytics réservée aux admins" ON public.analytics_events
FOR SELECT
TO authenticated
USING (public.is_superadmin(auth.uid()));
