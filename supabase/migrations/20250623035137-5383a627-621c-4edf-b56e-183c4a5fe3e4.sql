
-- Create table for prebuilt voice metadata (if not exists)
CREATE TABLE IF NOT EXISTS public.prebuilt_voices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voice_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  gender TEXT NOT NULL,
  accent TEXT NOT NULL,
  description TEXT NOT NULL,
  required_plan TEXT NOT NULL DEFAULT 'free',
  file_path TEXT,
  is_generated BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert prebuilt voice data (only if table is empty)
INSERT INTO public.prebuilt_voices (voice_id, name, category, gender, accent, description, required_plan) 
SELECT * FROM (VALUES
  ('narrator-david', 'David - Professional Narrator', 'Professional', 'male', 'American', 'Deep, authoritative voice perfect for documentaries', 'free'),
  ('narrator-sarah', 'Sarah - News Anchor', 'Professional', 'female', 'British', 'Clear, confident voice ideal for news and presentations', 'free'),
  ('cartoon-mickey', 'Mickey Mouse Style', 'Cartoon', 'male', 'American', 'High-pitched, cheerful cartoon character voice', 'pro'),
  ('cartoon-minnie', 'Minnie Mouse Style', 'Cartoon', 'female', 'American', 'Sweet, high-pitched cartoon character voice', 'pro'),
  ('celebrity-morgan', 'Morgan Freeman Style', 'Celebrity', 'male', 'American', 'Deep, wise narrator voice', 'premium'),
  ('celebrity-oprah', 'Oprah Style', 'Celebrity', 'female', 'American', 'Warm, inspirational speaking voice', 'premium')
) AS v(voice_id, name, category, gender, accent, description, required_plan)
WHERE NOT EXISTS (SELECT 1 FROM public.prebuilt_voices WHERE voice_id = v.voice_id);

-- Enable RLS on prebuilt_voices table
ALTER TABLE public.prebuilt_voices ENABLE ROW LEVEL SECURITY;

-- Create policy for reading prebuilt voices (drop if exists first)
DROP POLICY IF EXISTS "Anyone can view prebuilt voices metadata" ON public.prebuilt_voices;
CREATE POLICY "Anyone can view prebuilt voices metadata" ON public.prebuilt_voices
  FOR SELECT USING (true);

-- Create transaction tracking table for better payment history
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  transaction_id TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('plan_upgrade', 'word_purchase')),
  amount INTEGER NOT NULL,
  currency TEXT DEFAULT 'INR',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  plan TEXT,
  words_purchased INTEGER,
  payment_method TEXT,
  gateway_response JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on transactions
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for transactions (drop if exists first)
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.transactions;
CREATE POLICY "Users can view their own transactions" ON public.transactions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert transactions" ON public.transactions;
CREATE POLICY "System can insert transactions" ON public.transactions
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "System can update transactions" ON public.transactions;
CREATE POLICY "System can update transactions" ON public.transactions
  FOR UPDATE USING (true);
