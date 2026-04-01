-- ==========================================
-- 24. ROLES ADMIN MULTI-PROFILS
-- ==========================================

ALTER TABLE public.app_admins
ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'superadmin',
ADD COLUMN IF NOT EXISTS organization_name TEXT,
ADD COLUMN IF NOT EXISTS territory_label TEXT;

UPDATE public.app_admins
SET role = 'superadmin'
WHERE role IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'app_admins_role_check'
  ) THEN
    ALTER TABLE public.app_admins
    ADD CONSTRAINT app_admins_role_check
    CHECK (role IN ('superadmin', 'admin', 'mairie'));
  END IF;
END $$;

DROP POLICY IF EXISTS "Lecture de son statut superadmin" ON public.app_admins;
DROP POLICY IF EXISTS "Lecture de son statut admin" ON public.app_admins;
CREATE POLICY "Lecture de son statut admin" ON public.app_admins
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
      AND role = 'superadmin'
  );
$$;

CREATE OR REPLACE FUNCTION public.get_admin_role(check_user_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.app_admins
  WHERE user_id = check_user_id
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_admin_role(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_role(UUID) TO anon, authenticated;
