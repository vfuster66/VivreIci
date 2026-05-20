-- ==========================================
-- 30. ETAT METIER DES ANNONCES ENTRAIDE
-- ==========================================

ALTER TABLE public.help_posts
  ADD COLUMN IF NOT EXISTS workflow_state TEXT NOT NULL DEFAULT 'searching'
  CHECK (workflow_state IN ('searching', 'found', 'closed'));

CREATE INDEX IF NOT EXISTS help_posts_workflow_state_idx
ON public.help_posts (workflow_state, created_at DESC);
