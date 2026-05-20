ALTER TABLE public.admin_audit_logs
  DROP CONSTRAINT IF EXISTS admin_audit_logs_action_check;

ALTER TABLE public.admin_audit_logs
  ADD CONSTRAINT admin_audit_logs_action_check CHECK (
    action IN (
      'admin_role_granted',
      'admin_role_updated',
      'admin_role_revoked',
      'user_created',
      'user_updated',
      'user_password_reset_requested',
      'user_deleted',
      'report_created',
      'help_post_created',
      'animal_post_created',
      'animal_post_updated',
      'animal_alert_created',
      'animal_alert_updated'
    )
  );
