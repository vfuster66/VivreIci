-- ==========================================
-- 26. JOURNAL DES ACTIONS ADMIN
-- ==========================================

CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (
    action IN (
      'admin_role_granted',
      'admin_role_updated',
      'admin_role_revoked'
    )
  ),
  previous_role TEXT,
  next_role TEXT,
  organization_name TEXT,
  territory_label TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_audit_logs_created_idx
ON public.admin_audit_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS admin_audit_logs_target_created_idx
ON public.admin_audit_logs (target_user_id, created_at DESC);

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lecture des logs admin réservée aux superadmins" ON public.admin_audit_logs;
CREATE POLICY "Lecture des logs admin réservée aux superadmins" ON public.admin_audit_logs
FOR SELECT
TO authenticated
USING (public.is_superadmin(auth.uid()));
