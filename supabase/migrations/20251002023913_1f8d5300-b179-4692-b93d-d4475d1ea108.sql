-- Create user-generates bucket for storing generated voice files
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-generates', 'user-generates', false);

-- RLS policies for user-generates bucket
CREATE POLICY "Users can view their own generated files"
ON storage.objects FOR SELECT
USING (bucket_id = 'user-generates' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own generated files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'user-generates' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own generated files"
ON storage.objects FOR DELETE
USING (bucket_id = 'user-generates' AND auth.uid()::text = (storage.foldername(name))[1]);