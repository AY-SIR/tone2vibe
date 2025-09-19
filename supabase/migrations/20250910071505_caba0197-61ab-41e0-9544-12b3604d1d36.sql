-- Fix the handle_new_user function to properly save full_name from signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public 
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
    COALESCE(
      NEW.raw_user_meta_data ->> 'fullName',
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.raw_user_meta_data ->> 'name',
      SPLIT_PART(NEW.email, '@', 1)
    ),
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
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = COALESCE(
      NEW.raw_user_meta_data ->> 'fullName',
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.raw_user_meta_data ->> 'name',
      profiles.full_name,
      SPLIT_PART(NEW.email, '@', 1)
    ),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$;