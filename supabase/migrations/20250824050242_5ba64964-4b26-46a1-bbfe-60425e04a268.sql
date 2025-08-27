-- Add missing plan date columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN plan_start_date TIMESTAMPTZ,
ADD COLUMN plan_end_date TIMESTAMPTZ;

-- Update existing profiles to set plan dates for non-free users
UPDATE public.profiles 
SET 
  plan_start_date = created_at,
  plan_end_date = created_at + INTERVAL '30 days'
WHERE plan != 'free' AND plan_start_date IS NULL;

-- Create function to automatically set plan dates when plan is updated
CREATE OR REPLACE FUNCTION public.set_plan_dates()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Create trigger to automatically manage plan dates
CREATE TRIGGER trigger_set_plan_dates
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_plan_dates();