-- ==========================================
-- 21. MODERATION SIMPLE + GARDE-FOUS ANTI-SPAM
-- ==========================================

CREATE TABLE IF NOT EXISTS public.report_abuse_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (reason IN ('spam', 'incorrect', 'abusive', 'duplicate', 'other')),
  details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (report_id, user_id)
);

CREATE INDEX IF NOT EXISTS report_abuse_flags_report_created_idx
ON public.report_abuse_flags (report_id, created_at DESC);

ALTER TABLE public.report_abuse_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Signalement d'abus par son auteur" ON public.report_abuse_flags;
CREATE POLICY "Signalement d'abus par son auteur" ON public.report_abuse_flags
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Lecture admin des signalements d'abus" ON public.report_abuse_flags;
CREATE POLICY "Lecture admin des signalements d'abus" ON public.report_abuse_flags
FOR SELECT
TO authenticated
USING (public.is_superadmin(auth.uid()));

ALTER TABLE public.reports
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

UPDATE public.reports
SET expires_at = CASE
  WHEN deleted_at IS NOT NULL THEN deleted_at
  WHEN status = 'archived' THEN COALESCE(archived_at, updated_at, created_at, now()) + interval '7 days'
  WHEN status = 'resolved' THEN COALESCE(updated_at, created_at, now()) + interval '30 days'
  ELSE NULL
END
WHERE expires_at IS NULL;

CREATE OR REPLACE FUNCTION public.sync_report_expiration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.deleted_at IS NOT NULL THEN
    NEW.expires_at = NEW.deleted_at;
  ELSIF NEW.status = 'archived' THEN
    NEW.expires_at = COALESCE(NEW.archived_at, now()) + interval '7 days';
  ELSIF NEW.status = 'resolved' THEN
    NEW.expires_at = COALESCE(NEW.updated_at, now()) + interval '30 days';
  ELSE
    NEW.expires_at = NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS reports_sync_expiration ON public.reports;
CREATE TRIGGER reports_sync_expiration
BEFORE INSERT OR UPDATE OF status, archived_at, deleted_at ON public.reports
FOR EACH ROW
EXECUTE FUNCTION public.sync_report_expiration();

CREATE OR REPLACE FUNCTION public.prevent_non_admin_soft_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.deleted_at IS NOT NULL
     AND OLD.deleted_at IS NULL
     AND COALESCE(auth.role(), '') <> 'service_role'
     AND NOT public.is_superadmin(auth.uid()) THEN
    RAISE EXCEPTION 'Seul un administrateur peut supprimer ce signalement.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS reports_prevent_non_admin_soft_delete ON public.reports;
CREATE TRIGGER reports_prevent_non_admin_soft_delete
BEFORE UPDATE OF deleted_at ON public.reports
FOR EACH ROW
EXECUTE FUNCTION public.prevent_non_admin_soft_delete();

CREATE OR REPLACE FUNCTION public.enforce_report_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
  reports_last_hour INTEGER;
  reports_last_day INTEGER;
BEGIN
  IF COALESCE(auth.role(), '') = 'service_role' THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*)
  INTO reports_last_hour
  FROM public.reports
  WHERE user_id = NEW.user_id
    AND created_at >= now() - interval '1 hour';

  IF reports_last_hour >= 5 THEN
    RAISE EXCEPTION 'Vous avez déjà envoyé plusieurs signalements récemment. Réessayez dans quelques minutes.';
  END IF;

  SELECT COUNT(*)
  INTO reports_last_day
  FROM public.reports
  WHERE user_id = NEW.user_id
    AND created_at >= now() - interval '24 hours';

  IF reports_last_day >= 20 THEN
    RAISE EXCEPTION 'Vous avez atteint la limite quotidienne de signalements. Réessayez demain.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS reports_rate_limit_insert ON public.reports;
CREATE TRIGGER reports_rate_limit_insert
BEFORE INSERT ON public.reports
FOR EACH ROW
EXECUTE FUNCTION public.enforce_report_rate_limit();
