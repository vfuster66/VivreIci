CREATE TABLE IF NOT EXISTS public.animal_alert_confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID NOT NULL REFERENCES public.animal_alerts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vote TEXT NOT NULL CHECK (vote IN ('confirm', 'clear')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (alert_id, user_id)
);

CREATE INDEX IF NOT EXISTS animal_alert_confirmations_alert_vote_idx
ON public.animal_alert_confirmations (alert_id, vote, created_at DESC);

ALTER TABLE public.animal_alert_confirmations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lecture publique des confirmations alertes animales"
ON public.animal_alert_confirmations;
CREATE POLICY "Lecture publique des confirmations alertes animales"
ON public.animal_alert_confirmations
FOR SELECT
TO authenticated, anon
USING (true);

DROP POLICY IF EXISTS "Insertion de ses confirmations alertes animales"
ON public.animal_alert_confirmations;
CREATE POLICY "Insertion de ses confirmations alertes animales"
ON public.animal_alert_confirmations
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Mise a jour de ses confirmations alertes animales"
ON public.animal_alert_confirmations;
CREATE POLICY "Mise a jour de ses confirmations alertes animales"
ON public.animal_alert_confirmations
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Suppression de ses confirmations alertes animales"
ON public.animal_alert_confirmations;
CREATE POLICY "Suppression de ses confirmations alertes animales"
ON public.animal_alert_confirmations
FOR DELETE
TO authenticated
USING (auth.uid() = user_id OR public.is_superadmin(auth.uid()));
