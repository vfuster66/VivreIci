-- ==========================================
-- 22. CYCLE DE VIE DES SIGNALEMENTS
-- ==========================================

CREATE OR REPLACE FUNCTION public.sync_report_expiration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.deleted_at IS NOT NULL THEN
    NEW.expires_at = NEW.deleted_at;
  ELSIF NEW.status = 'archived' THEN
    NEW.expires_at = COALESCE(NEW.archived_at, now()) + interval '30 days';
  ELSE
    NEW.expires_at = NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

UPDATE public.reports
SET expires_at = CASE
  WHEN deleted_at IS NOT NULL THEN deleted_at
  WHEN status = 'archived' THEN COALESCE(archived_at, updated_at, created_at, now()) + interval '30 days'
  ELSE NULL
END;
