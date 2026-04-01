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

CREATE TABLE IF NOT EXISTS public.animal_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  alert_type TEXT NOT NULL,
  title TEXT,
  description TEXT,
  severity TEXT DEFAULT 'medium',
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  photo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lost_pets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  pet_name TEXT,
  status TEXT DEFAULT 'lost',
  photo_url TEXT,
  description TEXT,
  contact_info TEXT,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  last_seen_at TIMESTAMPTZ,
  is_found BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.animal_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lost_pets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lecture publique des signalements" ON public.reports;
CREATE POLICY "Lecture publique des signalements" ON public.reports
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Création de signalement (utilisateurs connectés)" ON public.reports;
CREATE POLICY "Création de signalement (utilisateurs connectés)" ON public.reports
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Modification de ses propres signalements" ON public.reports;
CREATE POLICY "Modification de ses propres signalements" ON public.reports
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Lecture publique des alertes animales" ON public.animal_alerts;
CREATE POLICY "Lecture publique des alertes animales" ON public.animal_alerts
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Création d'alertes animales (utilisateurs connectés)" ON public.animal_alerts;
CREATE POLICY "Création d'alertes animales (utilisateurs connectés)" ON public.animal_alerts
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Modification de ses propres alertes" ON public.animal_alerts;
CREATE POLICY "Modification de ses propres alertes" ON public.animal_alerts
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Lecture publique des animaux perdus" ON public.lost_pets;
CREATE POLICY "Lecture publique des animaux perdus" ON public.lost_pets
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Création d'annonces animaux (utilisateurs connectés)" ON public.lost_pets;
CREATE POLICY "Création d'annonces animaux (utilisateurs connectés)" ON public.lost_pets
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Modification de ses propres annonces" ON public.lost_pets;
CREATE POLICY "Modification de ses propres annonces" ON public.lost_pets
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);
