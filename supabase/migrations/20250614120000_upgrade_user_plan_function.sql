
CREATE OR REPLACE FUNCTION public.upgrade_user_plan(
  p_user_id uuid,
  p_plan user_plan,
  p_payment_id text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update user plan
  UPDATE public.profiles 
  SET 
    plan = p_plan,
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
    updated_at = NOW()
  WHERE id = p_user_id;
  
  -- Record payment
  INSERT INTO public.payments (user_id, plan, amount, currency, payment_id, status)
  VALUES (
    p_user_id,
    p_plan,
    CASE 
      WHEN p_plan = 'pro' THEN 9900
      WHEN p_plan = 'premium' THEN 29900
      ELSE 0
    END,
    'INR',
    p_payment_id,
    'paid'
  );
END;
$$;
