INSERT INTO storage.buckets (id, name, public) VALUES ('geo-files', 'geo-files', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload geo files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'geo-files');

CREATE POLICY "Anyone can read geo files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'geo-files');

CREATE POLICY "Authenticated users can update geo files"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'geo-files');

CREATE POLICY "Authenticated users can delete geo files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'geo-files');