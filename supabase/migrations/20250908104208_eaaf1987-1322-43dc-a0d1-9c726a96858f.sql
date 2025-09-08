-- Phase 1: Harden RLS policies and add security constraints

-- Fix profiles RLS - remove conflicting policies and make secure
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "No direct inserts from client" ON public.profiles;

-- Create proper profile policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles  
  FOR UPDATE USING (auth.uid() = user_id);

-- Service role can manage profiles (for triggers/functions)
CREATE POLICY "Service can manage profiles" ON public.profiles
  FOR ALL USING (auth.role() = 'service_role');

-- Fix orders RLS - make more restrictive
DROP POLICY IF EXISTS "insert_order" ON public.orders;
DROP POLICY IF EXISTS "update_order" ON public.orders;

CREATE POLICY "Users can create own orders" ON public.orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service can manage orders" ON public.orders
  FOR ALL USING (auth.role() = 'service_role');

-- Add idempotency constraints
ALTER TABLE public.word_purchases 
ADD CONSTRAINT unique_payment_id UNIQUE (payment_id);

ALTER TABLE public.orders 
ADD CONSTRAINT unique_stripe_session UNIQUE (stripe_session_id);

-- Fix missing auto-increment trigger for login count
CREATE OR REPLACE FUNCTION public.update_login_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update login count and timestamp
  NEW.login_count = COALESCE(OLD.login_count, 0) + 1;
  NEW.last_login_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for login tracking
DROP TRIGGER IF EXISTS track_user_login ON public.profiles;
CREATE TRIGGER track_user_login
  BEFORE UPDATE OF last_login_at ON public.profiles
  FOR EACH ROW
  WHEN (OLD.last_login_at IS DISTINCT FROM NEW.last_login_at)
  EXECUTE FUNCTION public.update_login_stats();

-- Add plan expiry notification function
CREATE OR REPLACE FUNCTION public.check_plan_expiry(user_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_profile RECORD;
  days_until_expiry INTEGER;
  result JSONB;
BEGIN
  -- Get user profile
  SELECT * INTO user_profile 
  FROM public.profiles 
  WHERE user_id = user_id_param;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('show_popup', false);
  END IF;
  
  -- Check if user has a paid plan with expiry date
  IF user_profile.plan = 'free' OR user_profile.plan_expires_at IS NULL THEN
    RETURN jsonb_build_object('show_popup', false);
  END IF;
  
  -- Calculate days until expiry
  days_until_expiry := EXTRACT(DAY FROM (user_profile.plan_expires_at - NOW()));
  
  -- Show popup if plan expired or expiring soon
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
$$;

-- Create table for tracking expiry notifications to avoid spam
CREATE TABLE IF NOT EXISTS public.expiry_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  notification_type TEXT NOT NULL, -- '7_days', '1_day', 'expired'
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  plan_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  CONSTRAINT unique_user_notification UNIQUE(user_id, notification_type, plan_expires_at)
);

-- Enable RLS on expiry notifications
ALTER TABLE public.expiry_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON public.expiry_notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service can manage notifications" ON public.expiry_notifications
  FOR ALL USING (auth.role() = 'service_role');