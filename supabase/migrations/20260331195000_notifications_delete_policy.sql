DROP POLICY IF EXISTS "Suppression de ses notifications" ON public.notifications;

CREATE POLICY "Suppression de ses notifications" ON public.notifications
FOR DELETE
TO authenticated
USING (user_id = auth.uid());
