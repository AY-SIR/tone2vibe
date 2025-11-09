-- Drop 2FA tables
DROP TABLE IF EXISTS public.user_2fa_attempts CASCADE;
DROP TABLE IF EXISTS public.user_2fa_settings CASCADE;

-- Clean up any 2FA-related data
-- (Tables are already dropped, so this is just for documentation)