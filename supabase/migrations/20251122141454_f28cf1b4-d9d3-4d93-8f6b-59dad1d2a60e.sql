-- =====================================================
-- FIX PROFILES TABLE RLS POLICIES
-- Consolidate duplicate policies and enforce strict access control
-- =====================================================

-- Drop all existing profiles RLS policies
DROP POLICY IF EXISTS "Allow logged-in users to read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow user update" ON public.profiles;
DROP POLICY IF EXISTS "Block anonymous access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Service can manage profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Create consolidated, secure RLS policies

-- Service role has full access (needed for backend operations)
CREATE POLICY "service_role_full_access"
ON public.profiles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Users can only SELECT their own profile
CREATE POLICY "users_select_own_profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can only UPDATE their own profile
CREATE POLICY "users_update_own_profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Note: No INSERT policy - profiles are created via database trigger on signup
-- Note: No DELETE policy - profile deletion should only happen via service role