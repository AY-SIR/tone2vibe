
-- Enable RLS on all tables that don't have it yet
ALTER TABLE public.user_voices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_voices
DROP POLICY IF EXISTS "Users can view their own voices" ON public.user_voices;
CREATE POLICY "Users can view their own voices" ON public.user_voices
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own voices" ON public.user_voices;
CREATE POLICY "Users can create their own voices" ON public.user_voices
FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own voices" ON public.user_voices;
CREATE POLICY "Users can update their own voices" ON public.user_voices
FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own voices" ON public.user_voices;
CREATE POLICY "Users can delete their own voices" ON public.user_voices
FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for user_analytics
DROP POLICY IF EXISTS "Users can view own analytics" ON public.user_analytics;
CREATE POLICY "Users can view own analytics" ON public.user_analytics
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own analytics" ON public.user_analytics;
CREATE POLICY "Users can update own analytics" ON public.user_analytics
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for projects
DROP POLICY IF EXISTS "Users can view own projects" ON public.projects;
CREATE POLICY "Users can view own projects" ON public.projects
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own projects" ON public.projects;
CREATE POLICY "Users can create own projects" ON public.projects
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for payments
DROP POLICY IF EXISTS "Users can view own payments" ON public.payments;
CREATE POLICY "Users can view own payments" ON public.payments
FOR SELECT USING (auth.uid() = user_id);

-- Create storage bucket for voice files
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-voices', 'user-voices', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for voice files bucket
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

-- Update word limits constraint to allow higher limits for premium
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS check_words_limit;
ALTER TABLE public.profiles 
ADD CONSTRAINT check_words_limit 
CHECK (words_limit <= 100000);
