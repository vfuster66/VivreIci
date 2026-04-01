-- ==========================================
-- 11. AVATAR DE PROFIL
-- ==========================================

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880,
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif'
  ]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Lecture publique des avatars" ON storage.objects;
CREATE POLICY "Lecture publique des avatars" ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Upload de son avatar" ON storage.objects;
CREATE POLICY "Upload de son avatar" ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND owner = auth.uid()
);

DROP POLICY IF EXISTS "Modification de son avatar" ON storage.objects;
CREATE POLICY "Modification de son avatar" ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND owner = auth.uid()
)
WITH CHECK (
  bucket_id = 'avatars'
  AND owner = auth.uid()
);

DROP POLICY IF EXISTS "Suppression de son avatar" ON storage.objects;
CREATE POLICY "Suppression de son avatar" ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND owner = auth.uid()
);
