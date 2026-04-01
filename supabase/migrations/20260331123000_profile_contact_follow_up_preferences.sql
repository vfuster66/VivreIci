-- ==========================================
-- 10. CONSENTEMENT DE RECONTACT
-- ==========================================

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS contact_follow_up_consent BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS contact_follow_up_actor TEXT NOT NULL DEFAULT 'none';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_contact_follow_up_actor_check'
  ) THEN
    ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_contact_follow_up_actor_check
    CHECK (contact_follow_up_actor IN ('none', 'mairie', 'vivreici'));
  END IF;
END;
$$;
