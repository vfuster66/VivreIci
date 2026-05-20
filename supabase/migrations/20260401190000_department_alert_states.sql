-- ==========================================
-- 24. ETATS D'ALERTE DEPARTEMENTAUX
-- ==========================================

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
    'department_alert_escalated'
  )
);

CREATE TABLE IF NOT EXISTS public.department_alert_states (
  department_code TEXT NOT NULL,
  department_name TEXT NOT NULL,
  alert_key TEXT NOT NULL,
  alert_title TEXT NOT NULL,
  category TEXT NOT NULL,
  official_level TEXT NOT NULL CHECK (
    official_level IN ('green', 'yellow', 'orange', 'red', 'black')
  ),
  official_rank INTEGER NOT NULL CHECK (official_rank BETWEEN 1 AND 5),
  alert_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (department_code, alert_key)
);

CREATE INDEX IF NOT EXISTS department_alert_states_last_seen_idx
ON public.department_alert_states (last_seen_at DESC);
