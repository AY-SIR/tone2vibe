-- Add item-level history retention and coupon tracking
DO $$
BEGIN
  -- Add plan_at_creation to history
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'history' AND column_name = 'plan_at_creation'
  ) THEN
    ALTER TABLE public.history ADD COLUMN plan_at_creation TEXT DEFAULT 'free';
  END IF;

  -- Add retention_expires_at to history
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'history' AND column_name = 'retention_expires_at'
  ) THEN
    ALTER TABLE public.history ADD COLUMN retention_expires_at TIMESTAMPTZ;
    CREATE INDEX IF NOT EXISTS idx_history_retention_expires_at ON public.history(retention_expires_at);
  END IF;

  -- Initialize retention_expires_at for existing rows (defaults to 7 days)
  UPDATE public.history
  SET retention_expires_at = COALESCE(retention_expires_at, created_at + INTERVAL '7 days')
  WHERE retention_expires_at IS NULL;

  -- Add coupon_code to orders
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'coupon_code'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN coupon_code TEXT;
  END IF;

  -- Ensure payment_request_id exists on orders (for safer verification)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'payment_request_id'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN payment_request_id TEXT;
  END IF;

  -- Seed default first-transaction coupon (10% off subscription)
  INSERT INTO public.coupons (code, discount_percentage, type, active, used_count, created_at)
  SELECT 'AST2VPYRRy10', 10, 'subscription', true, 0, NOW()
  WHERE NOT EXISTS (
    SELECT 1 FROM public.coupons WHERE UPPER(code) = 'AST2VPYRRRY10' OR code = 'AST2VPYRRy10'
  );
END $$;
