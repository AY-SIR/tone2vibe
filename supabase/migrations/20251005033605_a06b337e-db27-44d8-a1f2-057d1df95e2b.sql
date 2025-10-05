-- Add language column to user_voices table if it doesn't exist
ALTER TABLE public.user_voices 
ADD COLUMN IF NOT EXISTS language TEXT;

-- Add an index for better query performance when filtering by language
CREATE INDEX IF NOT EXISTS idx_user_voices_language 
ON public.user_voices(language);

-- Add comment to document the column
COMMENT ON COLUMN public.user_voices.language IS 'Language code for the recorded voice (e.g., en-US, hi-IN)';