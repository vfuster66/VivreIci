-- ==========================================
-- 9. PREFERENCES DE NOTIFICATION PROFIL
-- ==========================================

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS push_notifications BOOLEAN NOT NULL DEFAULT false;
