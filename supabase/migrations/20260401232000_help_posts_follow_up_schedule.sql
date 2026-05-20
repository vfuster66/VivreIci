-- ==========================================
-- 29. PLANIFICATION DU SUIVI ENTRAIDE
-- ==========================================

ALTER TABLE public.help_posts
  ADD COLUMN IF NOT EXISTS follow_up_scheduled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS follow_up_notified_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS help_posts_follow_up_idx
ON public.help_posts (status, follow_up_scheduled_at)
WHERE accepted_response_id IS NOT NULL;
