-- Create function to increment login count
CREATE OR REPLACE FUNCTION public.increment_login_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Increment login count when last_login_at is updated
  IF OLD.last_login_at IS DISTINCT FROM NEW.last_login_at THEN
    NEW.login_count = COALESCE(OLD.login_count, 0) + 1;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger to automatically increment login count
DROP TRIGGER IF EXISTS increment_login_count_trigger ON public.profiles;
CREATE TRIGGER increment_login_count_trigger
  BEFORE UPDATE OF last_login_at ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_login_count();