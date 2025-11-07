-- Create 2FA settings table
CREATE TABLE public.user_2fa_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  enabled boolean DEFAULT false,
  secret text NOT NULL,
  backup_codes text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_used_at timestamptz
);

-- Enable RLS
ALTER TABLE public.user_2fa_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own 2FA settings"
  ON public.user_2fa_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own 2FA settings"
  ON public.user_2fa_settings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own 2FA settings"
  ON public.user_2fa_settings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own 2FA settings"
  ON public.user_2fa_settings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create 2FA attempts tracking table
CREATE TABLE public.user_2fa_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  success boolean NOT NULL,
  attempted_at timestamptz DEFAULT now(),
  ip_address text
);

-- Enable RLS
ALTER TABLE public.user_2fa_attempts ENABLE ROW LEVEL SECURITY;

-- Only service role can access
CREATE POLICY "Service role only"
  ON public.user_2fa_attempts FOR ALL
  TO service_role
  USING (true);