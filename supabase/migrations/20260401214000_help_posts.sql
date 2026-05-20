-- ==========================================
-- 27. ENTRAIDE LOCALE
-- ==========================================

CREATE TABLE IF NOT EXISTS public.help_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('request', 'offer')),
  category TEXT NOT NULL CHECK (
    category IN (
      'Courses',
      'Déplacement',
      'Présence',
      'Matériel',
      'Voisinage',
      'Numérique'
    )
  ),
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  details TEXT NOT NULL,
  city TEXT NOT NULL,
  availability_text TEXT,
  contact_hint TEXT,
  author_label TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS help_posts_status_city_created_idx
ON public.help_posts (status, city, created_at DESC);

CREATE INDEX IF NOT EXISTS help_posts_user_created_idx
ON public.help_posts (user_id, created_at DESC);

ALTER TABLE public.help_posts ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.set_help_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS help_posts_set_updated_at ON public.help_posts;
CREATE TRIGGER help_posts_set_updated_at
BEFORE UPDATE ON public.help_posts
FOR EACH ROW
EXECUTE FUNCTION public.set_help_posts_updated_at();

DROP POLICY IF EXISTS "Lecture des annonces d'entraide ouvertes" ON public.help_posts;
CREATE POLICY "Lecture des annonces d'entraide ouvertes" ON public.help_posts
FOR SELECT
TO authenticated, anon
USING (status = 'open' OR user_id = auth.uid());

DROP POLICY IF EXISTS "Création de ses annonces d'entraide" ON public.help_posts;
CREATE POLICY "Création de ses annonces d'entraide" ON public.help_posts
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Mise à jour de ses annonces d'entraide" ON public.help_posts;
CREATE POLICY "Mise à jour de ses annonces d'entraide" ON public.help_posts
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Suppression de ses annonces d'entraide" ON public.help_posts;
CREATE POLICY "Suppression de ses annonces d'entraide" ON public.help_posts
FOR DELETE
TO authenticated
USING (user_id = auth.uid());
