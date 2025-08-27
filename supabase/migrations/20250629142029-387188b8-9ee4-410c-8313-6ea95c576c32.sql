
-- Create proper analytics tables for Pro/Premium users
CREATE TABLE IF NOT EXISTS public.user_analytics_detailed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  words_processed INTEGER DEFAULT 0,
  projects_created INTEGER DEFAULT 0,
  languages_used TEXT[],
  voice_types_used TEXT[],
  processing_time_ms INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Create plan-based voice collections
CREATE TABLE IF NOT EXISTS public.voice_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voice_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- 'basic', 'professional', 'cartoon', 'celebrity', 'anime'
  gender TEXT,
  accent TEXT,
  description TEXT,
  required_plan TEXT NOT NULL DEFAULT 'free', -- 'free', 'pro', 'premium'
  audio_preview_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create payment history table
CREATE TABLE IF NOT EXISTS public.plan_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan TEXT NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT DEFAULT 'INR',
  payment_id TEXT,
  status TEXT DEFAULT 'active',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create session tracking for proper logout
CREATE TABLE IF NOT EXISTS public.user_sessions_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_token TEXT NOT NULL,
  device_info JSONB,
  logged_out_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert sample voice collections for different plans
INSERT INTO public.voice_collections (voice_id, name, category, gender, accent, description, required_plan) VALUES
-- Free plan voices (basic)
('free_john', 'John', 'basic', 'male', 'american', 'Clear American male voice', 'free'),
('free_sarah', 'Sarah', 'basic', 'female', 'american', 'Friendly American female voice', 'free'),
('free_david', 'David', 'basic', 'male', 'british', 'Professional British male voice', 'free'),

-- Pro plan voices (professional + cartoon)
('pro_alex', 'Alex Professional', 'professional', 'male', 'neutral', 'Business presentation voice', 'pro'),
('pro_emma', 'Emma Professional', 'professional', 'female', 'neutral', 'Corporate female voice', 'pro'),
('pro_mickey', 'Mickey Mouse Style', 'cartoon', 'male', 'american', 'Fun cartoon mouse character', 'pro'),
('pro_minnie', 'Minnie Mouse Style', 'cartoon', 'female', 'american', 'Sweet cartoon mouse character', 'pro'),
('pro_bugs', 'Bugs Bunny Style', 'cartoon', 'male', 'american', 'Classic cartoon rabbit', 'pro'),

-- Premium plan voices (all + celebrity + anime)
('premium_morgan', 'Morgan Freeman Style', 'celebrity', 'male', 'american', 'Deep authoritative narrator voice', 'premium'),
('premium_scarlett', 'Scarlett Johansson Style', 'celebrity', 'female', 'american', 'Sultry actress voice', 'premium'),
('premium_goku', 'Goku Style', 'anime', 'male', 'japanese', 'Energetic anime hero voice', 'premium'),
('premium_sailor', 'Sailor Moon Style', 'anime', 'female', 'japanese', 'Magical girl anime voice', 'premium'),
('premium_naruto', 'Naruto Style', 'anime', 'male', 'japanese', 'Young ninja anime voice', 'premium');

-- Enable RLS on new tables
ALTER TABLE public.user_analytics_detailed ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions_tracking ENABLE ROW LEVEL SECURITY;

-- RLS policies for analytics
CREATE POLICY "Users can view own analytics" ON public.user_analytics_detailed
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own analytics" ON public.user_analytics_detailed
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS policies for voice collections (public read)
CREATE POLICY "Anyone can view voice collections" ON public.voice_collections
  FOR SELECT TO authenticated USING (true);

-- RLS policies for plan subscriptions
CREATE POLICY "Users can view own subscriptions" ON public.plan_subscriptions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own subscriptions" ON public.plan_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS policies for session tracking
CREATE POLICY "Users can view own sessions" ON public.user_sessions_tracking
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sessions" ON public.user_sessions_tracking
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sessions" ON public.user_sessions_tracking
  FOR UPDATE USING (auth.uid() = user_id);

-- Function to check if user exists
CREATE OR REPLACE FUNCTION public.check_user_email_exists(email_to_check TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users 
    WHERE email = email_to_check
  );
END;
$$;

-- Function to track daily analytics
CREATE OR REPLACE FUNCTION public.track_daily_analytics(
  p_user_id UUID,
  p_words_processed INTEGER DEFAULT 0,
  p_projects_created INTEGER DEFAULT 0,
  p_language TEXT DEFAULT NULL,
  p_voice_type TEXT DEFAULT NULL,
  p_processing_time INTEGER DEFAULT 0
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_analytics_detailed (
    user_id, 
    words_processed, 
    projects_created,
    languages_used,
    voice_types_used,
    processing_time_ms
  )
  VALUES (
    p_user_id,
    p_words_processed,
    p_projects_created,
    CASE WHEN p_language IS NOT NULL THEN ARRAY[p_language] ELSE '{}' END,
    CASE WHEN p_voice_type IS NOT NULL THEN ARRAY[p_voice_type] ELSE '{}' END,
    p_processing_time
  )
  ON CONFLICT (user_id, date) DO UPDATE SET
    words_processed = user_analytics_detailed.words_processed + p_words_processed,
    projects_created = user_analytics_detailed.projects_created + p_projects_created,
    languages_used = array_cat(
      user_analytics_detailed.languages_used,
      CASE WHEN p_language IS NOT NULL AND NOT (p_language = ANY(user_analytics_detailed.languages_used))
      THEN ARRAY[p_language] ELSE '{}' END
    ),
    voice_types_used = array_cat(
      user_analytics_detailed.voice_types_used,
      CASE WHEN p_voice_type IS NOT NULL AND NOT (p_voice_type = ANY(user_analytics_detailed.voice_types_used))
      THEN ARRAY[p_voice_type] ELSE '{}' END
    ),
    processing_time_ms = user_analytics_detailed.processing_time_ms + p_processing_time;
END;
$$;

-- Function to record plan subscription
CREATE OR REPLACE FUNCTION public.record_plan_subscription(
  p_user_id UUID,
  p_plan TEXT,
  p_amount INTEGER,
  p_currency TEXT DEFAULT 'INR',
  p_payment_id TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.plan_subscriptions (
    user_id,
    plan,
    amount,
    currency,
    payment_id,
    expires_at
  )
  VALUES (
    p_user_id,
    p_plan,
    p_amount,
    p_currency,
    p_payment_id,
    NOW() + INTERVAL '30 days'
  );
END;
$$;
