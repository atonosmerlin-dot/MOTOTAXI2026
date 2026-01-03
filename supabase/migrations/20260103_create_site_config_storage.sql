-- Create storage bucket for site configuration files (like hero image)
INSERT INTO storage.buckets (id, name, public)
VALUES ('site-config', 'site-config', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policy for site-config bucket
-- Allow public read
CREATE POLICY "Public read site-config" ON storage.objects FOR SELECT USING (bucket_id = 'site-config');

-- Allow authenticated users to upload (only admins will actually upload via admin panel)
CREATE POLICY "Authenticated can upload site-config" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'site-config'
  AND auth.role() = 'authenticated'
);

-- Allow updates to site-config
CREATE POLICY "Allow update site-config" ON storage.objects FOR UPDATE USING (bucket_id = 'site-config');

-- Allow delete from site-config (for cleanup)
CREATE POLICY "Allow delete site-config" ON storage.objects FOR DELETE USING (bucket_id = 'site-config');
