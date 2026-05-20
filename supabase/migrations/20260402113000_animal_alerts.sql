CREATE TABLE IF NOT EXISTS public.animal_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (
    alert_type IN (
      'processionnaires',
      'epillets',
      'tiques',
      'puces',
      'plantes_toxiques',
      'cyanobacteries',
      'chaleur',
      'autre'
    )
  ),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  city TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('medium', 'high')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'expired')),
  source_type TEXT NOT NULL DEFAULT 'community' CHECK (source_type IN ('community', 'official', 'system')),
  species_scope TEXT NOT NULL DEFAULT 'all' CHECK (species_scope IN ('all', 'cat', 'dog', 'bird', 'nac', 'multiple')),
  observed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  author_label TEXT NOT NULL,
  author_avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT animal_alerts_title_no_private_contact
    CHECK (NOT public.contains_private_contact(title)),
  CONSTRAINT animal_alerts_description_no_private_contact
    CHECK (NOT public.contains_private_contact(description)),
  CONSTRAINT animal_alerts_city_no_private_contact
    CHECK (NOT public.contains_private_contact(city))
);

ALTER TABLE public.animal_alerts
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT,
  ADD COLUMN IF NOT EXISTS source_type TEXT,
  ADD COLUMN IF NOT EXISTS species_scope TEXT,
  ADD COLUMN IF NOT EXISTS observed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN,
  ADD COLUMN IF NOT EXISTS author_label TEXT,
  ADD COLUMN IF NOT EXISTS author_avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

UPDATE public.animal_alerts
SET
  city = COALESCE(NULLIF(city, ''), 'À préciser'),
  status = COALESCE(
    status,
    CASE
      WHEN is_active IS NULL OR is_active THEN 'active'
      ELSE 'expired'
    END
  ),
  source_type = COALESCE(source_type, 'community'),
  species_scope = COALESCE(species_scope, 'all'),
  is_verified = COALESCE(is_verified, false),
  author_label = COALESCE(NULLIF(author_label, ''), 'Habitant local'),
  updated_at = COALESCE(updated_at, created_at, now())
WHERE
  city IS NULL
  OR city = ''
  OR status IS NULL
  OR source_type IS NULL
  OR species_scope IS NULL
  OR is_verified IS NULL
  OR author_label IS NULL
  OR author_label = ''
  OR updated_at IS NULL;

ALTER TABLE public.animal_alerts
  ALTER COLUMN city SET DEFAULT 'À préciser',
  ALTER COLUMN city SET NOT NULL,
  ALTER COLUMN status SET DEFAULT 'active',
  ALTER COLUMN status SET NOT NULL,
  ALTER COLUMN source_type SET DEFAULT 'community',
  ALTER COLUMN source_type SET NOT NULL,
  ALTER COLUMN species_scope SET DEFAULT 'all',
  ALTER COLUMN species_scope SET NOT NULL,
  ALTER COLUMN is_verified SET DEFAULT false,
  ALTER COLUMN is_verified SET NOT NULL,
  ALTER COLUMN author_label SET DEFAULT 'Habitant local',
  ALTER COLUMN author_label SET NOT NULL,
  ALTER COLUMN updated_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET NOT NULL;

ALTER TABLE public.animal_alerts
  DROP CONSTRAINT IF EXISTS animal_alerts_status_check,
  DROP CONSTRAINT IF EXISTS animal_alerts_source_type_check,
  DROP CONSTRAINT IF EXISTS animal_alerts_species_scope_check,
  DROP CONSTRAINT IF EXISTS animal_alerts_title_no_private_contact,
  DROP CONSTRAINT IF EXISTS animal_alerts_description_no_private_contact,
  DROP CONSTRAINT IF EXISTS animal_alerts_city_no_private_contact;

ALTER TABLE public.animal_alerts
  ADD CONSTRAINT animal_alerts_status_check
    CHECK (status IN ('active', 'resolved', 'expired')),
  ADD CONSTRAINT animal_alerts_source_type_check
    CHECK (source_type IN ('community', 'official', 'system')),
  ADD CONSTRAINT animal_alerts_species_scope_check
    CHECK (species_scope IN ('all', 'cat', 'dog', 'bird', 'nac', 'multiple')),
  ADD CONSTRAINT animal_alerts_title_no_private_contact
    CHECK (NOT public.contains_private_contact(title)),
  ADD CONSTRAINT animal_alerts_description_no_private_contact
    CHECK (NOT public.contains_private_contact(description)),
  ADD CONSTRAINT animal_alerts_city_no_private_contact
    CHECK (NOT public.contains_private_contact(city));

CREATE INDEX IF NOT EXISTS animal_alerts_status_created_idx
ON public.animal_alerts (status, created_at DESC);

CREATE INDEX IF NOT EXISTS animal_alerts_city_status_idx
ON public.animal_alerts (city, status, created_at DESC);

ALTER TABLE public.animal_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Aucun acces direct aux alertes animales" ON public.animal_alerts;
CREATE POLICY "Aucun acces direct aux alertes animales" ON public.animal_alerts
FOR ALL
TO authenticated, anon
USING (false)
WITH CHECK (false);
