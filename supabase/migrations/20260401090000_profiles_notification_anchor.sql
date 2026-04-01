-- ==========================================
-- 20. ANCRE GEOGRAPHIQUE POUR NOTIFICATIONS
-- ==========================================

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS notification_lat DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS notification_lng DOUBLE PRECISION;
