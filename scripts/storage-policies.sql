-- ============================================================================
-- SEEDBAY: STORAGE POLICIES (STRICT)
-- Bucket: project-files (private)
-- Path convention: deliverables/<project_id>/<file>
-- ============================================================================

-- 1) Ensure bucket is private
UPDATE storage.buckets
SET public = false
WHERE id = 'project-files';

-- 2) Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3) Helper functions (safe UUID parsing from path)
CREATE OR REPLACE FUNCTION public.safe_uuid(input text)
RETURNS uuid
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN input ~ '^[0-9a-fA-F-]{36}$' THEN input::uuid
    ELSE NULL
  END
$$;

CREATE OR REPLACE FUNCTION public.storage_project_id(path text)
RETURNS uuid
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT public.safe_uuid(split_part(path, '/', 2))
$$;

-- 4) Drop legacy policies (if any)
DROP POLICY IF EXISTS "Public read" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated read" ON storage.objects;
DROP POLICY IF EXISTS "Vendor upload own deliverables" ON storage.objects;
DROP POLICY IF EXISTS "Vendor read own deliverables" ON storage.objects;

-- 5) Vendor upload policy (strict)
CREATE POLICY "Vendor upload own deliverables" ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'project-files'
  AND split_part(name, '/', 1) = 'deliverables'
  AND EXISTS (
    SELECT 1
    FROM public.projects p
    JOIN public.users u ON u.id = p.seller_id
    WHERE p.id = public.storage_project_id(name)
      AND u.id = auth.uid()
      AND u.role IN ('vendor', 'admin')
  )
);

-- 6) Vendor read policy (optional, for managing own files)
CREATE POLICY "Vendor read own deliverables" ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'project-files'
  AND split_part(name, '/', 1) = 'deliverables'
  AND EXISTS (
    SELECT 1
    FROM public.projects p
    JOIN public.users u ON u.id = p.seller_id
    WHERE p.id = public.storage_project_id(name)
      AND u.id = auth.uid()
      AND u.role IN ('vendor', 'admin')
  )
);
