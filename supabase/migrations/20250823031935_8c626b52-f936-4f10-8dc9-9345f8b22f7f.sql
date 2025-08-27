-- Create Stripe payment integration edge functions and clean up unused functions

-- First, let's create a simple orders table for one-time payments tracking
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_session_id TEXT UNIQUE,
  amount INTEGER NOT NULL,
  currency TEXT DEFAULT 'usd' NOT NULL,
  status TEXT DEFAULT 'pending' NOT NULL,
  plan TEXT,
  words_purchased INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row-Level Security
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Create policies for orders
CREATE POLICY "select_own_orders" ON public.orders
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "insert_order" ON public.orders
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "update_order" ON public.orders
  FOR UPDATE
  USING (true);

-- Add country detection for payment currency
CREATE TABLE IF NOT EXISTS public.payment_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL UNIQUE,
  currency TEXT NOT NULL,
  payment_gateway TEXT NOT NULL,
  allowed BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert supported countries
INSERT INTO public.payment_settings (country_code, currency, payment_gateway, allowed) VALUES
('IN', 'inr', 'stripe', true),
('US', 'usd', 'stripe', true),
('GB', 'usd', 'stripe', true),
('CA', 'usd', 'stripe', true),
('AU', 'usd', 'stripe', true),
('DE', 'usd', 'stripe', true),
('FR', 'usd', 'stripe', true),
('JP', 'usd', 'stripe', true)
ON CONFLICT (country_code) DO NOTHING;

-- Enable RLS
ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read payment settings
CREATE POLICY "anyone_can_read_payment_settings" ON public.payment_settings
  FOR SELECT
  USING (true);