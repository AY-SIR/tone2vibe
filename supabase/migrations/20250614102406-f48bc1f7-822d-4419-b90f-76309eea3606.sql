
-- Add missing fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN full_name TEXT,
ADD COLUMN avatar_url TEXT,
ADD COLUMN company TEXT,
ADD COLUMN country TEXT,
ADD COLUMN preferred_language TEXT;
