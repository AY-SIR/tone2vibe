
-- Create table for tracking user word usage in real-time
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  words_used INTEGER NOT NULL DEFAULT 0,
  session_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for user sessions
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for user sessions
CREATE POLICY "Users can view their own sessions" 
  ON public.user_sessions 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sessions" 
  ON public.user_sessions 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions" 
  ON public.user_sessions 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Add function to update word count in real-time
CREATE OR REPLACE FUNCTION public.update_word_count(user_id UUID, new_word_count INTEGER)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update the profiles table with new word count
  UPDATE public.profiles 
  SET 
    words_used = words_used + new_word_count,
    updated_at = NOW()
  WHERE id = user_id;
  
  -- Insert or update session tracking
  INSERT INTO public.user_sessions (user_id, words_used, last_updated)
  VALUES (user_id, new_word_count, NOW())
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    words_used = user_sessions.words_used + new_word_count,
    last_updated = NOW();
END;
$$;
