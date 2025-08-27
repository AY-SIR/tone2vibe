
-- Update word limits and pricing for plans
UPDATE public.profiles 
SET words_limit = 41000 
WHERE plan = 'pro';

UPDATE public.profiles 
SET words_limit = 99999 
WHERE plan = 'premium';

-- Update the upgrade function to use correct limits and new pricing
CREATE OR REPLACE FUNCTION public.upgrade_user_plan(p_user_id uuid, p_plan text, p_payment_id text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  UPDATE public.profiles 
  SET 
    plan = p_plan::user_plan,
    words_limit = CASE 
      WHEN p_plan = 'pro' THEN 41000
      WHEN p_plan = 'premium' THEN 99999
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
  
  -- Record payment with new pricing
  IF p_payment_id IS NOT NULL THEN
    INSERT INTO public.payments (user_id, plan, amount, payment_id, status, currency)
    VALUES (
      p_user_id, 
      p_plan::user_plan, 
      CASE WHEN p_plan = 'pro' THEN 15100 ELSE 30100 END, -- New INR pricing in paise
      p_payment_id,
      'paid',
      'INR'
    );
  END IF;
END;
$function$;

-- Remove existing prebuilt voices to implement AI-powered system
DELETE FROM public.prebuilt_voices;

-- Create table for AI-generated character voices
CREATE TABLE IF NOT EXISTS public.ai_generated_voices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_name TEXT NOT NULL,
  character_description TEXT NOT NULL,
  ai_summary TEXT NOT NULL,
  voice_file_path TEXT,
  voice_id TEXT UNIQUE NOT NULL,
  gender TEXT,
  accent TEXT,
  category TEXT,
  usage_count INTEGER DEFAULT 0,
  created_by_user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for ai_generated_voices
ALTER TABLE public.ai_generated_voices ENABLE ROW LEVEL SECURITY;

-- Create policy for ai_generated_voices (public read access)
CREATE POLICY "Public can view AI generated voices" 
  ON public.ai_generated_voices 
  FOR SELECT 
  USING (true);

-- Create policy for inserting AI generated voices
CREATE POLICY "Users can create AI generated voices" 
  ON public.ai_generated_voices 
  FOR INSERT 
  WITH CHECK (auth.uid() = created_by_user_id);

-- Create table for user location and currency preferences
CREATE TABLE IF NOT EXISTS public.user_location_data (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  country TEXT,
  currency TEXT DEFAULT 'INR',
  ip_address TEXT,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for user_location_data
ALTER TABLE public.user_location_data ENABLE ROW LEVEL SECURITY;

-- Create policy for user_location_data
CREATE POLICY "Users can view their own location data" 
  ON public.user_location_data 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own location data" 
  ON public.user_location_data 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can modify their own location data" 
  ON public.user_location_data 
  FOR UPDATE 
  USING (auth.uid() = user_id);
