-- Fix search_path for existing functions
CREATE OR REPLACE FUNCTION public.update_word_count(user_id uuid, new_word_count integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  -- Update the profiles table with new word count
  UPDATE public.profiles 
  SET 
    words_used = words_used + new_word_count,
    updated_at = NOW()
  WHERE id = user_id;
  
  -- Insert or update session tracking
  INSERT INTO public.user_sessions (user_id, words_used, last_updated)
  VALUES (user_id, new_word_count, NOW())
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    words_used = user_sessions.words_used + new_word_count,
    last_updated = NOW();
END;
$function$

---

CREATE OR REPLACE FUNCTION public.increment_login_count()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  -- Increment login count when last_login_at is updated
  IF OLD.last_login_at IS DISTINCT FROM NEW.last_login_at THEN
    NEW.login_count = COALESCE(OLD.login_count, 0) + 1;
  END IF;
  
  RETURN NEW;
END;
$function$

---

CREATE OR REPLACE FUNCTION public.set_plan_dates()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  -- If plan is changing from free to paid, set start and end dates
  IF OLD.plan = 'free' AND NEW.plan != 'free' THEN
    NEW.plan_start_date = NOW();
    NEW.plan_end_date = NOW() + INTERVAL '30 days';
    NEW.plan_expires_at = NOW() + INTERVAL '30 days';
  -- If plan is changing from paid to free, clear the dates
  ELSIF OLD.plan != 'free' AND NEW.plan = 'free' THEN
    NEW.plan_start_date = NULL;
    NEW.plan_end_date = NULL;
    NEW.plan_expires_at = NULL;
  END IF;
  
  RETURN NEW;
END;
$function$

---

CREATE OR REPLACE FUNCTION public.update_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$

---

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$