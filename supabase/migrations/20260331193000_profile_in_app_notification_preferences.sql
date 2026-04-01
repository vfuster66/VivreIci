-- ==========================================
-- 19. PREFERENCES NOTIFICATIONS IN-APP
-- ==========================================

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS in_app_notifications BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS nearby_report_notifications BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS report_updates_notifications BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS nearby_notifications_radius_meters INTEGER NOT NULL DEFAULT 500;
