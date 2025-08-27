
-- Phase 1: Create storage buckets and enhance existing tables
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('audio-files', 'audio-files', true),
  ('voice-recordings', 'voice-recordings', true);

-- Create storage policies for audio files
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'audio-files');
CREATE POLICY "Users can upload audio" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'audio-files' AND auth.uid() IS NOT NULL);
CREATE POLICY "Users can update own audio" ON storage.objects FOR UPDATE USING (bucket_id = 'audio-files' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own audio" ON storage.objects FOR DELETE USING (bucket_id = 'audio-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Public Access Voice" ON storage.objects FOR SELECT USING (bucket_id = 'voice-recordings');
CREATE POLICY "Users can upload voice" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'voice-recordings' AND auth.uid() IS NOT NULL);
CREATE POLICY "Users can update own voice" ON storage.objects FOR UPDATE USING (bucket_id = 'voice-recordings' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own voice" ON storage.objects FOR DELETE USING (bucket_id = 'voice-recordings' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Phase 2: Create analytics table
CREATE TABLE public.user_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  total_projects INTEGER DEFAULT 0,
  total_words_processed INTEGER DEFAULT 0,
  total_audio_generated INTEGER DEFAULT 0,
  languages_used TEXT[] DEFAULT '{}',
  avg_project_length DECIMAL(10,2) DEFAULT 0,
  most_used_language TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own analytics" ON public.user_analytics
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can insert analytics" ON public.user_analytics
  FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update analytics" ON public.user_analytics
  FOR UPDATE USING (true);

-- Phase 3: Enhance user_voices table
ALTER TABLE public.user_voices 
  ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en-US',
  ADD COLUMN IF NOT EXISTS custom_name TEXT,
  ADD COLUMN IF NOT EXISTS file_path TEXT,
  ADD COLUMN IF NOT EXISTS file_size INTEGER;

-- Phase 3: Enhance projects table
ALTER TABLE public.projects 
  ADD COLUMN IF NOT EXISTS audio_file_path TEXT,
  ADD COLUMN IF NOT EXISTS audio_file_size INTEGER;

-- Phase 5: Create word purchases table for premium users
CREATE TABLE public.word_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  words_purchased INTEGER NOT NULL,
  amount_paid INTEGER NOT NULL,
  currency TEXT DEFAULT 'INR',
  payment_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.word_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own purchases" ON public.word_purchases
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can insert purchases" ON public.word_purchases
  FOR INSERT WITH CHECK (true);

-- Add GST and plan expiry to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_payment_date TIMESTAMPTZ;

-- Create function to auto-downgrade expired plans
CREATE OR REPLACE FUNCTION public.handle_plan_expiry()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles 
  SET 
    plan = 'free',
    words_limit = 1000,
    upload_limit_mb = 5,
    plan_expires_at = NULL
  WHERE 
    plan_expires_at IS NOT NULL 
    AND plan_expires_at < now()
    AND plan != 'free';
END;
$$;

-- Create analytics update function
CREATE OR REPLACE FUNCTION public.update_user_analytics(
  p_user_id UUID,
  p_words_processed INTEGER DEFAULT 0,
  p_language TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_analytics (
    user_id, 
    total_projects, 
    total_words_processed, 
    total_audio_generated,
    languages_used,
    most_used_language
  )
  VALUES (
    p_user_id, 
    1, 
    p_words_processed, 
    1,
    CASE WHEN p_language IS NOT NULL THEN ARRAY[p_language] ELSE '{}' END,
    p_language
  )
  ON CONFLICT (user_id) DO UPDATE SET
    total_projects = user_analytics.total_projects + 1,
    total_words_processed = user_analytics.total_words_processed + p_words_processed,
    total_audio_generated = user_analytics.total_audio_generated + 1,
    languages_used = CASE 
      WHEN p_language IS NOT NULL AND NOT (p_language = ANY(user_analytics.languages_used))
      THEN user_analytics.languages_used || p_language
      ELSE user_analytics.languages_used
    END,
    updated_at = now();
END;
$$;
