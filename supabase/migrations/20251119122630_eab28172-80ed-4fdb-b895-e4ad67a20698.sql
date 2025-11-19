-- Create invoices storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('invoices', 'invoices', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for invoices bucket
CREATE POLICY "Users can view their own invoices"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'invoices' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Service role can manage invoice files"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'invoices');