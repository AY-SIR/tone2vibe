-- Fix word_balance for free users - they should have 0 purchased words
UPDATE public.profiles 
SET word_balance = 0 
WHERE plan = 'free';

-- Update the default value for word_balance to be 0 instead of 1000
ALTER TABLE public.profiles 
ALTER COLUMN word_balance SET DEFAULT 0;

-- Update the handle_new_user function to set correct initial values
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    user_id, 
    full_name, 
    email,
    plan,
    words_limit,
    words_used,
    plan_words_used,
    word_balance,
    total_words_used,
    upload_limit_mb,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', ''),
    NEW.email,
    'free',
    1000,  -- Plan words limit
    0,     -- Legacy words used
    0,     -- Plan words used  
    0,     -- Purchased words (word_balance) - should be 0 for free users
    0,     -- Total words used
    10,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;