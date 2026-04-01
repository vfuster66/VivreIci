-- ==========================================
-- 6. PROPRIETAIRE + SUPERADMIN SUR REPORTS
-- ==========================================
--
-- Cette migration :
-- - ajoute une table d'administrateurs applicatifs
-- - retire les policies publiques d'insertion / modification / suppression
-- - rétablit une gestion propriétaire ou superadmin sur reports

CREATE TABLE IF NOT EXISTS public.app_admins (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.app_admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lecture de son statut superadmin" ON public.app_admins;
CREATE POLICY "Lecture de son statut superadmin" ON public.app_admins
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.is_superadmin(check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.app_admins
    WHERE user_id = check_user_id
  );
$$;

REVOKE ALL ON FUNCTION public.is_superadmin(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_superadmin(UUID) TO anon, authenticated;

DROP POLICY IF EXISTS "Création publique de signalements" ON public.reports;
DROP POLICY IF EXISTS "Modification publique de signalements" ON public.reports;
DROP POLICY IF EXISTS "Suppression publique de signalements" ON public.reports;
DROP POLICY IF EXISTS "Création de signalement (utilisateurs connectés)" ON public.reports;
DROP POLICY IF EXISTS "Modification de ses propres signalements" ON public.reports;
DROP POLICY IF EXISTS "Suppression de ses propres signalements" ON public.reports;
DROP POLICY IF EXISTS "Création propriétaire de signalement" ON public.reports;
DROP POLICY IF EXISTS "Modification propriétaire ou superadmin" ON public.reports;
DROP POLICY IF EXISTS "Suppression propriétaire ou superadmin" ON public.reports;

CREATE POLICY "Création propriétaire de signalement" ON public.reports
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Modification propriétaire ou superadmin" ON public.reports
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id
  OR public.is_superadmin(auth.uid())
)
WITH CHECK (
  auth.uid() = user_id
  OR public.is_superadmin(auth.uid())
);

CREATE POLICY "Suppression propriétaire ou superadmin" ON public.reports
FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id
  OR public.is_superadmin(auth.uid())
);
