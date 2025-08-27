
-- Fix plan limits and add proper constraints
UPDATE public.profiles 
SET words_limit = 50000 
WHERE plan = 'premium' AND words_limit > 50000;

-- Add constraint to prevent unlimited words
ALTER TABLE public.profiles 
ADD CONSTRAINT check_words_limit 
CHECK (words_limit <= 99999);

-- Create function to handle plan expiration properly
CREATE OR REPLACE FUNCTION public.check_and_expire_plans()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update expired plans back to free
  UPDATE public.profiles 
  SET 
    plan = 'free',
    words_limit = 1000,
    upload_limit_mb = 5
  WHERE 
    plan_expires_at IS NOT NULL 
    AND plan_expires_at < NOW()
    AND plan != 'free';
    
  -- Log the expiration
  INSERT INTO public.user_analytics (user_id, total_projects, total_words_processed)
  SELECT id, 0, 0 FROM public.profiles 
  WHERE plan_expires_at IS NOT NULL AND plan_expires_at < NOW()
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;

-- Add proper indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_plan_expires ON public.profiles(plan_expires_at) WHERE plan_expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_analytics_user_id ON public.user_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_user_id_created ON public.projects(user_id, created_at);

-- Enable RLS on missing tables
ALTER TABLE public.user_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for analytics
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

-- Fix word count tracking function
CREATE OR REPLACE FUNCTION public.update_word_count(user_id uuid, new_word_count integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user has enough words remaining
  IF (SELECT words_used + new_word_count <= words_limit FROM public.profiles WHERE id = user_id) THEN
    -- Update the profiles table with new word count
    UPDATE public.profiles 
    SET 
      words_used = words_used + new_word_count,
      updated_at = NOW()
    WHERE id = user_id;
  ELSE
    RAISE EXCEPTION 'Insufficient word balance';
  END IF;
END;
$$;
