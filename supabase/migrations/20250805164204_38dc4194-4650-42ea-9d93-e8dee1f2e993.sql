
-- Create storage bucket for user voices if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-voices',
  'user-voices', 
  false,
  52428800, -- 50MB limit
  ARRAY['audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/webm', 'audio/ogg']
)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for user voices bucket
CREATE POLICY "Users can upload their own voice files" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'user-voices' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own voice files" ON storage.objects
FOR SELECT USING (
  bucket_id = 'user-voices' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own voice files" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'user-voices' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own voice files" ON storage.objects
FOR DELETE USING (
  bucket_id = 'user-voices' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Create storage bucket for projects/audio outputs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-audio',
  'project-audio',
  false,
  104857600, -- 100MB limit
  ARRAY['audio/wav', 'audio/mp3', 'audio/mpeg']
)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for project audio bucket
CREATE POLICY "Users can upload project audio" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'project-audio' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own project audio" ON storage.objects
FOR SELECT USING (
  bucket_id = 'project-audio' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own project audio" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'project-audio' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own project audio" ON storage.objects
FOR DELETE USING (
  bucket_id = 'project-audio' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
