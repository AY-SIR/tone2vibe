-- Fix 1: Add SET search_path = public to all SECURITY DEFINER functions
-- This prevents privilege escalation attacks

-- Update prevent_banned_email_signup function
CREATE OR REPLACE FUNCTION public.prevent_banned_email_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF EXISTS (SELECT 1 FROM public.banned_emails WHERE email = NEW.email) THEN
    RAISE EXCEPTION 'banned_email';
  END IF;
  RETURN NEW;
END;
$function$;

-- Update increment_login_count function
CREATE OR REPLACE FUNCTION public.increment_login_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF OLD.last_login_at IS DISTINCT FROM NEW.last_login_at THEN
    NEW.login_count = COALESCE(OLD.login_count, 0) + 1;
  END IF;
  RETURN NEW;
END;
$function$;

-- Update update_login_stats function  
CREATE OR REPLACE FUNCTION public.update_login_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.login_count = COALESCE(OLD.login_count, 0) + 1;
  NEW.last_login_at = NOW();
  RETURN NEW;
END;
$function$;

-- Update add_purchased_words function
CREATE OR REPLACE FUNCTION public.add_purchased_words(user_id_param uuid, words_to_add integer, payment_id_param text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  UPDATE public.profiles 
  SET 
    word_balance = word_balance + words_to_add,
    last_word_purchase_at = NOW(),
    updated_at = NOW()
  WHERE user_id = user_id_param;
  
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
    words_to_add * 0.01,
    payment_id_param,
    'completed',
    NOW()
  );
  
  RETURN TRUE;
END;
$function$;

-- Update check_plan_expiry function
CREATE OR REPLACE FUNCTION public.check_plan_expiry(user_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  user_profile RECORD;
  days_until_expiry INTEGER;
  result JSONB;
BEGIN
  SELECT * INTO user_profile 
  FROM public.profiles 
  WHERE user_id = user_id_param;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('show_popup', false);
  END IF;
  
  IF user_profile.plan = 'free' OR user_profile.plan_expires_at IS NULL THEN
    RETURN jsonb_build_object('show_popup', false);
  END IF;
  
  days_until_expiry := EXTRACT(DAY FROM (user_profile.plan_expires_at - NOW()));
  
  IF days_until_expiry <= 7 THEN
    RETURN jsonb_build_object(
      'show_popup', true,
      'days_until_expiry', days_until_expiry,
      'plan', user_profile.plan,
      'expires_at', user_profile.plan_expires_at,
      'is_expired', days_until_expiry < 0
    );
  END IF;
  
  RETURN jsonb_build_object('show_popup', false);
END;
$function$;

-- Update validate_coupon_secure function
CREATE OR REPLACE FUNCTION public.validate_coupon_secure(p_coupon_code text)
RETURNS TABLE(id uuid, code text, discount_percentage integer, discount_amount numeric, type text, expires_at timestamp without time zone, max_uses integer, used_count integer, is_valid boolean, error_message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_coupon RECORD;
  v_failed_attempts integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN QUERY SELECT 
      NULL::uuid, NULL::text, NULL::integer, NULL::numeric, NULL::text, NULL::timestamp,
      NULL::integer, NULL::integer, false, 'Authentication required'::text;
    RETURN;
  END IF;

  SELECT COUNT(*) INTO v_failed_attempts
  FROM coupon_validation_attempts
  WHERE user_id = auth.uid()
    AND attempted_at > NOW() - INTERVAL '1 hour'
    AND success = false;

  IF v_failed_attempts >= 10 THEN
    RETURN QUERY SELECT 
      NULL::uuid, NULL::text, NULL::integer, NULL::numeric, NULL::text, NULL::timestamp,
      NULL::integer, NULL::integer, false, 'Too many failed attempts. Please try again later.'::text;
    RETURN;
  END IF;

  SELECT c.* INTO v_coupon
  FROM coupons c
  WHERE LOWER(c.code) = LOWER(TRIM(p_coupon_code))
    AND c.active = true;

  INSERT INTO coupon_validation_attempts (user_id, coupon_code, success)
  VALUES (auth.uid(), p_coupon_code, v_coupon.id IS NOT NULL);

  IF v_coupon.id IS NULL THEN
    RETURN QUERY SELECT 
      NULL::uuid, NULL::text, NULL::integer, NULL::numeric, NULL::text, NULL::timestamp,
      NULL::integer, NULL::integer, false, 'Invalid coupon code'::text;
    RETURN;
  END IF;

  IF v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at < NOW() THEN
    RETURN QUERY SELECT v_coupon.id, v_coupon.code, v_coupon.discount_percentage, v_coupon.discount_amount,
      v_coupon.type, v_coupon.expires_at, v_coupon.max_uses, v_coupon.used_count, false, 'Coupon has expired'::text;
    RETURN;
  END IF;

  IF v_coupon.max_uses IS NOT NULL AND v_coupon.used_count >= v_coupon.max_uses THEN
    RETURN QUERY SELECT v_coupon.id, v_coupon.code, v_coupon.discount_percentage, v_coupon.discount_amount,
      v_coupon.type, v_coupon.expires_at, v_coupon.max_uses, v_coupon.used_count, false, 'Coupon usage limit reached'::text;
    RETURN;
  END IF;

  RETURN QUERY SELECT v_coupon.id, v_coupon.code, v_coupon.discount_percentage, v_coupon.discount_amount,
    v_coupon.type, v_coupon.expires_at, v_coupon.max_uses, v_coupon.used_count, true, 'Coupon is valid'::text;
END;
$function$;

-- Update increment_coupon_usage_secure function
CREATE OR REPLACE FUNCTION public.increment_coupon_usage_secure(p_coupon_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  UPDATE coupons
  SET 
    used_count = used_count + 1,
    last_used_at = NOW(),
    updated_at = NOW()
  WHERE id = p_coupon_id
    AND active = true
    AND (max_uses IS NULL OR used_count < max_uses);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Coupon not found or usage limit reached';
  END IF;
END;
$function$;

-- Update cleanup_expired_audio_tokens function
CREATE OR REPLACE FUNCTION public.cleanup_expired_audio_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  DELETE FROM audio_access_tokens
  WHERE expires_at < now();
END;
$function$;

-- Update increment_prebuilt_voice_usage function
CREATE OR REPLACE FUNCTION public.increment_prebuilt_voice_usage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_voice_id TEXT;
BEGIN
  IF NEW.voice_settings ? 'voice_id' THEN
    v_voice_id := NEW.voice_settings->>'voice_id';
    UPDATE public.prebuilt_voices
    SET usage_count = usage_count + 1,
        updated_at = NOW()
    WHERE voice_id = v_voice_id;
  END IF;
  RETURN NEW;
END;
$function$;

-- Update cleanup_expired_tokens function
CREATE OR REPLACE FUNCTION public.cleanup_expired_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  DELETE FROM public.play_tokens
  WHERE expires_at < NOW() - INTERVAL '1 day';
END;
$function$;

-- Update generate_verification_token function
CREATE OR REPLACE FUNCTION public.generate_verification_token()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  token TEXT;
BEGIN
  token := encode(gen_random_bytes(32), 'hex');
  RETURN token;
END;
$function$;

-- Update check_plan_expiry (overloaded version) function
CREATE OR REPLACE FUNCTION public.check_plan_expiry()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  UPDATE public.user_subscriptions
  SET is_active = false
  WHERE expires_at < now()
    AND is_active = true;
END;
$function$;

-- Update reset_plan_words function
CREATE OR REPLACE FUNCTION public.reset_plan_words(user_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  UPDATE public.profiles 
  SET 
    plan_words_used = 0,
    words_used = 0,
    updated_at = NOW()
  WHERE user_id = user_id_param;
END;
$function$;

-- Fix 2: Restrict coupon table SELECT to service_role only
-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Allow read of active coupons for authenticated users" ON public.coupons;
DROP POLICY IF EXISTS "Service role only access to coupons" ON public.coupons;

-- Create strict service_role only policy for SELECT
CREATE POLICY "Service role only can select coupons"
ON public.coupons FOR SELECT
USING (auth.role() = 'service_role');

-- Ensure other operations are also restricted to service_role
DROP POLICY IF EXISTS "Allow insert for service role" ON public.coupons;
DROP POLICY IF EXISTS "Allow update for service role" ON public.coupons;
DROP POLICY IF EXISTS "Allow delete for service role" ON public.coupons;

CREATE POLICY "Service role only can insert coupons"
ON public.coupons FOR INSERT
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role only can update coupons"
ON public.coupons FOR UPDATE
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role only can delete coupons"
ON public.coupons FOR DELETE
USING (auth.role() = 'service_role');