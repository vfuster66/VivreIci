ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS animal_alert_notifications BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS animal_alerts_high_priority_only BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.notifications
DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
ADD CONSTRAINT notifications_type_check CHECK (
  type IN (
    'report_created_nearby',
    'report_updated',
    'report_resolved',
    'report_archived',
    'user_report_update',
    'department_alert_escalated',
    'help_post_response_received',
    'help_post_contact_unlocked',
    'help_post_follow_up',
    'animal_post_response_received',
    'animal_post_contact_unlocked',
    'animal_alert_created_nearby'
  )
);
