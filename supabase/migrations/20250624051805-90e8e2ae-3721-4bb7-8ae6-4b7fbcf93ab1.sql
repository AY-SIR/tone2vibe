
-- Update word purchase pricing and limits
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS max_word_purchase_limit INTEGER DEFAULT 5000;

-- Update limits based on plan
UPDATE public.profiles 
SET max_word_purchase_limit = CASE 
  WHEN plan = 'free' THEN 5000
  WHEN plan = 'pro' THEN 41000  -- 10K base + 41K extra = 51K total
  WHEN plan = 'premium' THEN 99999
END;

-- Create enhanced analytics table for detailed tracking
CREATE TABLE IF NOT EXISTS public.detailed_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  language TEXT NOT NULL,
  input_words INTEGER DEFAULT 0,
  output_words INTEGER DEFAULT 0,
  voice_type TEXT NOT NULL, -- 'record', 'history', 'prebuilt'
  voice_id TEXT,
  response_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on detailed analytics
ALTER TABLE public.detailed_analytics ENABLE ROW LEVEL SECURITY;

-- Policy for detailed analytics
CREATE POLICY "Users can view own detailed analytics" ON public.detailed_analytics
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert detailed analytics" ON public.detailed_analytics
  FOR INSERT WITH CHECK (true);

-- Create function to auto-delete user data when user is deleted
CREATE OR REPLACE FUNCTION public.handle_user_deletion()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete user's projects
  DELETE FROM public.projects WHERE user_id = OLD.id;
  
  -- Delete user's voices
  DELETE FROM public.user_voices WHERE user_id = OLD.id;
  
  -- Delete user's payments
  DELETE FROM public.payments WHERE user_id = OLD.id;
  DELETE FROM public.word_purchases WHERE user_id = OLD.id;
  DELETE FROM public.transactions WHERE user_id = OLD.id;
  
  -- Delete user's analytics
  DELETE FROM public.user_analytics WHERE user_id = OLD.id;
  DELETE FROM public.detailed_analytics WHERE user_id = OLD.id;
  
  -- Delete user's sessions
  DELETE FROM public.user_sessions WHERE user_id = OLD.id;
  DELETE FROM public.realtime_sessions WHERE user_id = OLD.id;
  
  -- Delete user's processing queue
  DELETE FROM public.processing_queue WHERE user_id = OLD.id;
  
  -- Delete user's profile
  DELETE FROM public.profiles WHERE id = OLD.id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for user deletion
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
CREATE TRIGGER on_auth_user_deleted
  BEFORE DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_deletion();

-- Update word purchase limits function
CREATE OR REPLACE FUNCTION public.get_word_purchase_limit(user_plan TEXT)
RETURNS INTEGER AS $$
BEGIN
  RETURN CASE 
    WHEN user_plan = 'free' THEN 5000
    WHEN user_plan = 'pro' THEN 41000
    WHEN user_plan = 'premium' THEN 99999
    ELSE 5000
  END;
END;
$$ LANGUAGE plpgsql;

-- Update existing upgrade function to set proper limits
CREATE OR REPLACE FUNCTION public.upgrade_user_plan(p_user_id UUID, p_plan TEXT, p_payment_id TEXT DEFAULT NULL)
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles 
  SET 
    plan = p_plan::user_plan,
    words_limit = CASE 
      WHEN p_plan = 'pro' THEN 10000
      WHEN p_plan = 'premium' THEN 50000
      ELSE words_limit
    END,
    upload_limit_mb = CASE 
      WHEN p_plan = 'pro' THEN 25
      WHEN p_plan = 'premium' THEN 100
      ELSE upload_limit_mb
    END,
    max_word_purchase_limit = CASE 
      WHEN p_plan = 'pro' THEN 41000
      WHEN p_plan = 'premium' THEN 99999
      ELSE max_word_purchase_limit
    END,
    plan_expires_at = now() + INTERVAL '30 days',
    updated_at = now()
  WHERE id = p_user_id;
  
  -- Record payment if provided
  IF p_payment_id IS NOT NULL THEN
    INSERT INTO public.payments (user_id, plan, amount, payment_id, status, currency)
    VALUES (
      p_user_id, 
      p_plan::user_plan, 
      CASE WHEN p_plan = 'pro' THEN 9900 ELSE 29900 END,
      p_payment_id,
      'paid',
      'INR'
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
