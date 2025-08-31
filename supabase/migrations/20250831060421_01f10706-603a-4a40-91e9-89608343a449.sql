-- Create banned_emails table to enforce one-time deletion and prevent re-signup
CREATE TABLE IF NOT EXISTS public.banned_emails (
  email TEXT PRIMARY KEY,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS and allow public SELECT so we can warn users before signup/login
ALTER TABLE public.banned_emails ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'banned_emails' AND policyname = 'Anyone can check banned emails'
  ) THEN
    CREATE POLICY "Anyone can check banned emails"
    ON public.banned_emails
    FOR SELECT
    USING (true);
  END IF;
END $$;

-- Function and trigger to prevent signup for banned emails
CREATE OR REPLACE FUNCTION public.prevent_banned_email_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.banned_emails WHERE email = NEW.email) THEN
    RAISE EXCEPTION 'banned_email';
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users to block creation for banned emails
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'prevent_banned_signup'
  ) THEN
    CREATE TRIGGER prevent_banned_signup
    BEFORE INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.prevent_banned_email_signup();
  END IF;
END $$;