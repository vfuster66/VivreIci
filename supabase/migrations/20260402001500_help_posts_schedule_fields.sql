-- ==========================================
-- 32. DATE ET CRENEAU DES ANNONCES ENTRAIDE
-- ==========================================

ALTER TABLE public.help_posts
  ADD COLUMN IF NOT EXISTS scheduled_for DATE,
  ADD COLUMN IF NOT EXISTS availability_slot TEXT
  CHECK (availability_slot IN ('morning', 'afternoon', 'evening', 'flexible'));

CREATE INDEX IF NOT EXISTS help_posts_scheduled_for_idx
ON public.help_posts (scheduled_for, created_at DESC);
