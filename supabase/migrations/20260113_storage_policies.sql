-- =============================================
-- STORAGE BUCKET POLICIES FOR PRINT SERVICE
-- =============================================

-- Allow authenticated users to upload to print-designs bucket
CREATE POLICY "Allow authenticated users to upload print designs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'print-designs');

-- Allow public read access to print-designs bucket
CREATE POLICY "Allow public read access to print designs"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'print-designs');

-- Allow users to update their own uploads in print-designs
CREATE POLICY "Allow users to update their own print designs"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'print-designs' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'print-designs' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow users to delete their own uploads in print-designs
CREATE POLICY "Allow users to delete their own print designs"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'print-designs' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Same policies for print-uploads bucket
CREATE POLICY "Allow authenticated users to upload print uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'print-uploads');

CREATE POLICY "Allow public read access to print uploads"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'print-uploads');

CREATE POLICY "Allow users to update their own print uploads"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'print-uploads' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'print-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Allow users to delete their own print uploads"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'print-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Same policies for print-mockups bucket
CREATE POLICY "Allow authenticated users to upload print mockups"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'print-mockups');

CREATE POLICY "Allow public read access to print mockups"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'print-mockups');
