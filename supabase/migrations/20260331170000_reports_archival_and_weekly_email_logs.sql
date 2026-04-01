-- ==========================================
-- 15. ARCHIVAGE DES SIGNALEMENTS + LOGS EMAILS HEBDO
-- ==========================================

ALTER TABLE public.reports
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

UPDATE public.reports
SET archived_at = COALESCE(archived_at, updated_at, created_at, now())
WHERE status = 'archived'
  AND archived_at IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'reports_status_check'
  ) THEN
    ALTER TABLE public.reports
    ADD CONSTRAINT reports_status_check
    CHECK (status IN ('open', 'in_progress', 'resolved', 'archived'));
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_reports_archived_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'archived' AND OLD.status IS DISTINCT FROM 'archived' THEN
    NEW.archived_at = COALESCE(NEW.archived_at, now());
  ELSIF NEW.status IS DISTINCT FROM 'archived' THEN
    NEW.archived_at = NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS reports_sync_archived_at ON public.reports;
CREATE TRIGGER reports_sync_archived_at
BEFORE UPDATE ON public.reports
FOR EACH ROW
EXECUTE FUNCTION public.sync_reports_archived_at();

CREATE TABLE IF NOT EXISTS public.cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  postal_code TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.weekly_email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audience TEXT NOT NULL CHECK (audience IN ('users', 'city')),
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('sent', 'dry_run', 'skipped', 'failed')),
  dry_run BOOLEAN NOT NULL DEFAULT false,
  trigger_source TEXT NOT NULL DEFAULT 'manual',
  week_start TIMESTAMPTZ NOT NULL,
  week_end TIMESTAMPTZ NOT NULL,
  reports_count INTEGER NOT NULL DEFAULT 0,
  payload JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.weekly_email_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Accès superadmin aux logs emails hebdo" ON public.weekly_email_logs;
CREATE POLICY "Accès superadmin aux logs emails hebdo" ON public.weekly_email_logs
FOR ALL
TO authenticated
USING (public.is_superadmin(auth.uid()))
WITH CHECK (public.is_superadmin(auth.uid()));
