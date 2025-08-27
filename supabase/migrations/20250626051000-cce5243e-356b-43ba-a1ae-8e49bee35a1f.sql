
-- Update word limits for plans with new pricing structure
UPDATE public.profiles 
SET words_limit = 10000 
WHERE plan = 'pro';

UPDATE public.profiles 
SET words_limit = 50000 
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
  
  -- Record payment with correct pricing
  IF p_payment_id IS NOT NULL THEN
    INSERT INTO public.payments (user_id, plan, amount, payment_id, status, currency)
    VALUES (
      p_user_id, 
      p_plan::user_plan, 
      CASE WHEN p_plan = 'pro' THEN 9900 ELSE 29900 END, -- INR pricing in paise
      p_payment_id,
      'paid',
      'INR'
    );
  END IF;
END;
$function$;

-- Clean up old prebuilt voices to implement AI system
DELETE FROM public.prebuilt_voices;

-- Update AI generated voices table structure
ALTER TABLE public.ai_generated_voices 
ADD COLUMN IF NOT EXISTS suggested_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_popular BOOLEAN DEFAULT false;

-- Create index for faster voice lookups
CREATE INDEX IF NOT EXISTS idx_ai_voices_character_name ON public.ai_generated_voices(character_name);
CREATE INDEX IF NOT EXISTS idx_ai_voices_popularity ON public.ai_generated_voices(usage_count DESC, suggested_count DESC);

-- Update word purchase limits function
CREATE OR REPLACE FUNCTION public.get_word_purchase_limit(user_plan text)
RETURNS integer
LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN CASE 
    WHEN user_plan = 'free' THEN 0  -- Free users cannot buy words
    WHEN user_plan = 'pro' THEN 41000
    WHEN user_plan = 'premium' THEN 99999
    ELSE 0
  END;
END;
$function$;
