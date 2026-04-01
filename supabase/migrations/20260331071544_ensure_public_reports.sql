CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  type TEXT NOT NULL,
  status TEXT DEFAULT 'open',
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  photo_url TEXT,
  description TEXT,
  votes INTEGER DEFAULT 1,
  cluster_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lecture publique des signalements" ON public.reports;
CREATE POLICY "Lecture publique des signalements" ON public.reports
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Création publique de signalements" ON public.reports;
CREATE POLICY "Création publique de signalements" ON public.reports
FOR INSERT
TO anon, authenticated
WITH CHECK (true);
