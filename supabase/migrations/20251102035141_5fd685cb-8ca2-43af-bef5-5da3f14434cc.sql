-- Block anonymous access to profiles table
CREATE POLICY "Block anonymous access to profiles"
ON public.profiles
FOR SELECT TO anon
USING (false);