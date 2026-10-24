-- Migration: Create public bucket for brand assets (logos, email templates, public icons)
-- Project: Finance Pal (rjforcrdyfuodsqtopvp)
-- Ensures email clients and Supabase Studio dashboard can fetch brand assets without auth restrictions.

-- 1. Create the 'brand' bucket with public access enabled
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'brand',
  'brand',
  true,
  5242880, -- 5 MB limit
  ARRAY['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Allow anonymous and authenticated users to read brand assets publicly
DROP POLICY IF EXISTS "Brand assets are publicly accessible" ON storage.objects;
CREATE POLICY "Brand assets are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'brand');
