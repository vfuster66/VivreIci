-- ==========================================
-- 31. PRIORITE DES ANNONCES ENTRAIDE
-- ==========================================

ALTER TABLE public.help_posts
  ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'normal'
  CHECK (priority IN ('normal', 'urgent'));

CREATE INDEX IF NOT EXISTS help_posts_priority_created_idx
ON public.help_posts (priority, created_at DESC);
