DROP POLICY IF EXISTS "Création de signalement (utilisateurs connectés)" ON public.reports;
DROP POLICY IF EXISTS "Création publique de signalements" ON public.reports;

CREATE POLICY "Création publique de signalements" ON public.reports
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'photos',
  'photos',
  true,
  52428800,
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'video/mp4',
    'video/quicktime',
    'video/webm'
  ]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Lecture publique des médias photos" ON storage.objects;
CREATE POLICY "Lecture publique des médias photos" ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'photos');

DROP POLICY IF EXISTS "Upload public des médias photos" ON storage.objects;
CREATE POLICY "Upload public des médias photos" ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'photos');

DROP POLICY IF EXISTS "Modification des médias photos par propriétaire" ON storage.objects;
CREATE POLICY "Modification des médias photos par propriétaire" ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'photos' AND owner = auth.uid())
WITH CHECK (bucket_id = 'photos' AND owner = auth.uid());

DROP POLICY IF EXISTS "Suppression des médias photos par propriétaire" ON storage.objects;
CREATE POLICY "Suppression des médias photos par propriétaire" ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'photos' AND owner = auth.uid());
