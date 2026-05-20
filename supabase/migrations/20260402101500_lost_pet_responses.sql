ALTER TABLE public.lost_pets
  ADD COLUMN IF NOT EXISTS accepted_response_id UUID;

ALTER TABLE public.lost_pets
  DROP CONSTRAINT IF EXISTS lost_pets_pet_name_no_private_contact,
  DROP CONSTRAINT IF EXISTS lost_pets_description_no_private_contact,
  DROP CONSTRAINT IF EXISTS lost_pets_city_no_private_contact;

ALTER TABLE public.lost_pets
  ADD CONSTRAINT lost_pets_pet_name_no_private_contact
    CHECK (NOT public.contains_private_contact(pet_name)),
  ADD CONSTRAINT lost_pets_description_no_private_contact
    CHECK (NOT public.contains_private_contact(description)),
  ADD CONSTRAINT lost_pets_city_no_private_contact
    CHECK (NOT public.contains_private_contact(city));

CREATE TABLE IF NOT EXISTS public.lost_pet_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id UUID NOT NULL REFERENCES public.lost_pets(id) ON DELETE CASCADE,
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
  UNIQUE (pet_id, responder_user_id),
  CONSTRAINT lost_pet_responses_message_no_private_contact
    CHECK (NOT public.contains_private_contact(message))
);

CREATE INDEX IF NOT EXISTS lost_pet_responses_pet_created_idx
ON public.lost_pet_responses (pet_id, created_at DESC);

CREATE INDEX IF NOT EXISTS lost_pet_responses_owner_status_idx
ON public.lost_pet_responses (post_owner_user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS lost_pet_responses_responder_created_idx
ON public.lost_pet_responses (responder_user_id, created_at DESC);

ALTER TABLE public.lost_pet_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Aucun acces direct aux reponses animaux" ON public.lost_pet_responses;
CREATE POLICY "Aucun acces direct aux reponses animaux" ON public.lost_pet_responses
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
    'help_post_follow_up',
    'animal_post_response_received',
    'animal_post_contact_unlocked'
  )
);
