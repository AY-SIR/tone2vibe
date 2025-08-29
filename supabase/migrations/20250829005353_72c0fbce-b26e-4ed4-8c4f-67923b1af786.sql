-- Add blocked countries tracking and email notification settings
CREATE TABLE IF NOT EXISTS public.blocked_countries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL UNIQUE,
  country_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert blocked countries
INSERT INTO public.blocked_countries (country_code, country_name) 
VALUES 
  ('CN', 'China'),
  ('PK', 'Pakistan')
ON CONFLICT (country_code) DO NOTHING;

-- Add email notification tracking
CREATE TABLE IF NOT EXISTS public.purchase_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id),
  email_type TEXT NOT NULL DEFAULT 'purchase_confirmation',
  status TEXT NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.blocked_countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Anyone can read blocked countries" ON public.blocked_countries
  FOR SELECT USING (true);

CREATE POLICY "Users can view their notifications" ON public.purchase_notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service can manage notifications" ON public.purchase_notifications
  FOR ALL USING (true);