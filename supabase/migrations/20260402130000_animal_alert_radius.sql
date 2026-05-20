ALTER TABLE public.animal_alerts
  ADD COLUMN IF NOT EXISTS radius_meters INTEGER NOT NULL DEFAULT 500;

CREATE INDEX IF NOT EXISTS animal_alerts_status_radius_idx
ON public.animal_alerts (status, radius_meters, created_at DESC);
