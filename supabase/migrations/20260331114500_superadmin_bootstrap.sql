-- ==========================================
-- 8. BOOTSTRAP DU PREMIER SUPERADMIN
-- ==========================================

CREATE OR REPLACE FUNCTION public.can_bootstrap_first_superadmin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  IF auth.jwt() -> 'app_metadata' ->> 'provider' = 'anonymous' THEN
    RETURN false;
  END IF;

  RETURN NOT EXISTS (
    SELECT 1
    FROM public.app_admins
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.bootstrap_first_superadmin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
BEGIN
  IF current_user_id IS NULL THEN
    RETURN false;
  END IF;

  IF auth.jwt() -> 'app_metadata' ->> 'provider' = 'anonymous' THEN
    RETURN false;
  END IF;

  IF EXISTS (SELECT 1 FROM public.app_admins) THEN
    RETURN false;
  END IF;

  INSERT INTO public.app_admins (user_id)
  VALUES (current_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.can_bootstrap_first_superadmin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.bootstrap_first_superadmin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_bootstrap_first_superadmin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.bootstrap_first_superadmin() TO authenticated;
