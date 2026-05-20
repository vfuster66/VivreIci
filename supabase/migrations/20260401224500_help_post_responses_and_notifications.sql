-- ==========================================
-- 28. REPONSES ENTRAIDE + GARDE-FOU COORDONNEES
-- ==========================================

CREATE OR REPLACE FUNCTION public.contains_private_contact(input TEXT)
RETURNS BOOLEAN AS $$
  SELECT
    COALESCE(input, '') ~* '[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}'
    OR COALESCE(input, '') ~* '((\+|00)[[:space:]./-]*33|0)[[:space:]./-]*[1-9]([[:space:]./-]*[0-9]{2}){4}';
$$ LANGUAGE sql IMMUTABLE;

ALTER TABLE public.help_posts
  ADD COLUMN IF NOT EXISTS accepted_response_id UUID;

ALTER TABLE public.help_posts
  DROP CONSTRAINT IF EXISTS help_posts_title_no_private_contact,
  DROP CONSTRAINT IF EXISTS help_posts_summary_no_private_contact,
  DROP CONSTRAINT IF EXISTS help_posts_details_no_private_contact,
  DROP CONSTRAINT IF EXISTS help_posts_availability_no_private_contact,
  DROP CONSTRAINT IF EXISTS help_posts_contact_hint_no_private_contact;

ALTER TABLE public.help_posts
  ADD CONSTRAINT help_posts_title_no_private_contact
    CHECK (NOT public.contains_private_contact(title)),
  ADD CONSTRAINT help_posts_summary_no_private_contact
    CHECK (NOT public.contains_private_contact(summary)),
  ADD CONSTRAINT help_posts_details_no_private_contact
    CHECK (NOT public.contains_private_contact(details)),
  ADD CONSTRAINT help_posts_availability_no_private_contact
    CHECK (NOT public.contains_private_contact(availability_text)),
  ADD CONSTRAINT help_posts_contact_hint_no_private_contact
    CHECK (NOT public.contains_private_contact(contact_hint));

CREATE TABLE IF NOT EXISTS public.help_post_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.help_posts(id) ON DELETE CASCADE,
  post_owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  responder_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  responder_label TEXT NOT NULL,
  responder_avatar_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  UNIQUE (post_id, responder_user_id),
  CONSTRAINT help_post_responses_message_no_private_contact
    CHECK (NOT public.contains_private_contact(message))
);

CREATE INDEX IF NOT EXISTS help_post_responses_post_created_idx
ON public.help_post_responses (post_id, created_at DESC);

CREATE INDEX IF NOT EXISTS help_post_responses_owner_status_idx
ON public.help_post_responses (post_owner_user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS help_post_responses_responder_created_idx
ON public.help_post_responses (responder_user_id, created_at DESC);

ALTER TABLE public.help_post_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Aucun acces direct aux reponses d'entraide" ON public.help_post_responses;
CREATE POLICY "Aucun acces direct aux reponses d'entraide" ON public.help_post_responses
FOR ALL
TO authenticated, anon
USING (false)
WITH CHECK (false);

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
    'help_post_follow_up'
  )
);
