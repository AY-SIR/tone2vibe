-- Fix the word system to properly handle purchased vs plan words
-- Add plan_words_used to track plan-specific usage separately
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS plan_words_used INTEGER DEFAULT 0;

-- Update existing profiles to have proper plan_words_used values
UPDATE public.profiles 
SET plan_words_used = words_used 
WHERE plan_words_used IS NULL;

-- Create word purchase tracking function
CREATE OR REPLACE FUNCTION public.deduct_words_smartly(
  user_id_param UUID,
  words_to_deduct INTEGER
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_profile RECORD;
  plan_words_available INTEGER;
  plan_words_to_use INTEGER;
  purchased_words_to_use INTEGER;
  result JSONB;
BEGIN
  -- Get current user profile
  SELECT * INTO user_profile 
  FROM public.profiles 
  WHERE user_id = user_id_param;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User profile not found');
  END IF;
  
  -- Calculate available plan words
  plan_words_available := GREATEST(0, user_profile.words_limit - user_profile.plan_words_used);
  
  -- Determine how to split the deduction
  IF words_to_deduct <= plan_words_available THEN
    -- Use only plan words
    plan_words_to_use := words_to_deduct;
    purchased_words_to_use := 0;
  ELSIF plan_words_available > 0 THEN
    -- Use all remaining plan words + some purchased words
    plan_words_to_use := plan_words_available;
    purchased_words_to_use := words_to_deduct - plan_words_available;
  ELSE
    -- Use only purchased words
    plan_words_to_use := 0;
    purchased_words_to_use := words_to_deduct;
  END IF;
  
  -- Check if user has enough purchased words
  IF purchased_words_to_use > user_profile.word_balance THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Insufficient word balance',
      'needed', words_to_deduct,
      'plan_available', plan_words_available,
      'purchased_available', user_profile.word_balance
    );
  END IF;
  
  -- Update the profile
  UPDATE public.profiles 
  SET 
    plan_words_used = user_profile.plan_words_used + plan_words_to_use,
    word_balance = user_profile.word_balance - purchased_words_to_use,
    total_words_used = user_profile.total_words_used + words_to_deduct,
    updated_at = NOW()
  WHERE user_id = user_id_param;
  
  RETURN jsonb_build_object(
    'success', true,
    'words_deducted', words_to_deduct,
    'plan_words_used', plan_words_to_use,
    'purchased_words_used', purchased_words_to_use,
    'remaining_plan_words', plan_words_available - plan_words_to_use,
    'remaining_purchased_words', user_profile.word_balance - purchased_words_to_use
  );
END;
$$;

-- Function to reset plan words on plan renewal (preserves purchased words)
CREATE OR REPLACE FUNCTION public.reset_plan_words(user_id_param UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles 
  SET 
    plan_words_used = 0,
    words_used = 0, -- Reset legacy field too
    updated_at = NOW()
  WHERE user_id = user_id_param;
END;
$$;

-- Function to add purchased words (never expire)
CREATE OR REPLACE FUNCTION public.add_purchased_words(
  user_id_param UUID,
  words_to_add INTEGER,
  payment_id_param TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Add to word_balance (purchased words that never expire)
  UPDATE public.profiles 
  SET 
    word_balance = word_balance + words_to_add,
    last_word_purchase_at = NOW(),
    updated_at = NOW()
  WHERE user_id = user_id_param;
  
  -- Record the purchase
  INSERT INTO public.word_purchases (
    user_id,
    words_purchased,
    amount_paid,
    payment_id,
    status,
    created_at
  ) VALUES (
    user_id_param,
    words_to_add,
    words_to_add * 0.01, -- Assuming $0.01 per word
    payment_id_param,
    'completed',
    NOW()
  );
  
  RETURN TRUE;
END;
$$;