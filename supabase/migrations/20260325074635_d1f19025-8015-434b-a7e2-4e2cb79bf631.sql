
-- Create whatsapp-media public bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('whatsapp-media', 'whatsapp-media', true);

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'whatsapp-media');

-- Allow authenticated users to read files
CREATE POLICY "Authenticated users can read media"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'whatsapp-media');

-- Allow public read access (bucket is public)
CREATE POLICY "Public read access for whatsapp-media"
ON storage.objects FOR SELECT TO anon
USING (bucket_id = 'whatsapp-media');
