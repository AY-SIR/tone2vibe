
-- Create a table for user voice recordings
CREATE TABLE public.user_voices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  audio_blob BYTEA NOT NULL,
  duration TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_selected BOOLEAN DEFAULT false
);

-- Add Row Level Security (RLS)
ALTER TABLE public.user_voices ENABLE ROW LEVEL SECURITY;

-- Create policies for user voices
CREATE POLICY "Users can view their own voices" 
  ON public.user_voices 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own voices" 
  ON public.user_voices 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own voices" 
  ON public.user_voices 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own voices" 
  ON public.user_voices 
  FOR DELETE 
  USING (auth.uid() = user_id);
