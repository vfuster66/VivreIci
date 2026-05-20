CREATE TABLE IF NOT EXISTS public.animal_alert_moderation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID NOT NULL REFERENCES public.animal_alerts(id) ON DELETE CASCADE,
  actor_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (
    action IN (
      'animal_alert_verified',
      'animal_alert_unverified',
      'animal_alert_source_updated',
      'animal_alert_status_updated'
    )
  ),
  previous_value TEXT,
  next_value TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS animal_alert_moderation_logs_alert_created_idx
ON public.animal_alert_moderation_logs (alert_id, created_at DESC);

CREATE INDEX IF NOT EXISTS animal_alert_moderation_logs_actor_created_idx
ON public.animal_alert_moderation_logs (actor_user_id, created_at DESC);

ALTER TABLE public.animal_alert_moderation_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lecture logs moderation alertes animales reservee admins"
ON public.animal_alert_moderation_logs;
CREATE POLICY "Lecture logs moderation alertes animales reservee admins"
ON public.animal_alert_moderation_logs
FOR SELECT
TO authenticated
USING (public.is_superadmin(auth.uid()));
