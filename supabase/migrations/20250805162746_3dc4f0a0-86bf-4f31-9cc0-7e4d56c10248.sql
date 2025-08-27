
-- Create missing tables for voice functionality

-- Create projects table for storing voice generation projects
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  title TEXT NOT NULL,
  original_text TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'en-US',
  word_count INTEGER NOT NULL DEFAULT 0,
  audio_url TEXT,
  voice_settings JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_voices table for storing custom voice recordings
CREATE TABLE public.user_voices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  audio_blob TEXT,
  file_path TEXT,
  duration TEXT,
  language TEXT NOT NULL DEFAULT 'en-US',
  file_size INTEGER,
  custom_name TEXT,
  is_selected BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create processing_queue table for background jobs
CREATE TABLE public.processing_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  job_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  progress INTEGER NOT NULL DEFAULT 0,
  job_data JSONB,
  result_data JSONB,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create voice_processing_status table for real-time status updates
CREATE TABLE public.voice_processing_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  project_id UUID REFERENCES public.projects(id),
  processing_stage TEXT NOT NULL,
  progress_percentage INTEGER NOT NULL DEFAULT 0,
  status_message TEXT,
  estimated_completion TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS policies for projects table
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own projects" ON public.projects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own projects" ON public.projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own projects" ON public.projects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own projects" ON public.projects FOR DELETE USING (auth.uid() = user_id);

-- Add RLS policies for user_voices table
ALTER TABLE public.user_voices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own voices" ON public.user_voices FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own voices" ON public.user_voices FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own voices" ON public.user_voices FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own voices" ON public.user_voices FOR DELETE USING (auth.uid() = user_id);

-- Add RLS policies for processing_queue table
ALTER TABLE public.processing_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own jobs" ON public.processing_queue FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own jobs" ON public.processing_queue FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own jobs" ON public.processing_queue FOR UPDATE USING (auth.uid() = user_id);

-- Add RLS policies for voice_processing_status table
ALTER TABLE public.voice_processing_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own processing status" ON public.voice_processing_status FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own processing status" ON public.voice_processing_status FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own processing status" ON public.voice_processing_status FOR UPDATE USING (auth.uid() = user_id);

-- Update profiles table to use new column names
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS words_used INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS words_limit INTEGER DEFAULT 1000;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS upload_limit_mb INTEGER DEFAULT 10;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'en-US';

-- Create storage bucket for user voices
INSERT INTO storage.buckets (id, name, public) 
VALUES ('user-voices', 'user-voices', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for user voices bucket
CREATE POLICY "Users can upload their own voice files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'user-voices' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own voice files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'user-voices' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own voice files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'user-voices' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Create trigger to update updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_processing_queue_updated_at
  BEFORE UPDATE ON public.processing_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_voice_processing_status_updated_at
  BEFORE UPDATE ON public.voice_processing_status
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
