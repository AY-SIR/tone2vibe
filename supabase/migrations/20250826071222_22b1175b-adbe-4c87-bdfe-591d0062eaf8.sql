-- Create prebuilt voices table
CREATE TABLE public.prebuilt_voices (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  voice_id text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL,
  category text NOT NULL DEFAULT 'ai',
  gender text,
  accent text,
  required_plan text NOT NULL DEFAULT 'pro' CHECK (required_plan IN ('free', 'pro', 'premium')),
  audio_preview_url text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.prebuilt_voices ENABLE ROW LEVEL SECURITY;

-- Create policy for reading prebuilt voices
CREATE POLICY "Anyone can view active prebuilt voices" 
ON public.prebuilt_voices 
FOR SELECT 
USING (is_active = true);

-- Create function to update timestamps
CREATE TRIGGER update_prebuilt_voices_updated_at
BEFORE UPDATE ON public.prebuilt_voices
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample prebuilt voices
INSERT INTO public.prebuilt_voices (voice_id, name, description, category, gender, accent, required_plan, sort_order) VALUES
('alloy', 'Alloy', 'Neutral, balanced voice perfect for professional content', 'ai', 'neutral', 'american', 'pro', 1),
('echo', 'Echo', 'Warm, friendly voice ideal for educational content', 'ai', 'neutral', 'american', 'pro', 2),
('fable', 'Fable', 'Clear, articulate voice great for storytelling', 'ai', 'neutral', 'american', 'pro', 3),
('onyx', 'Onyx', 'Deep, authoritative voice perfect for narration', 'ai', 'male', 'american', 'pro', 4),
('nova', 'Nova', 'Bright, energetic voice ideal for dynamic content', 'ai', 'female', 'american', 'premium', 5),
('shimmer', 'Shimmer', 'Smooth, gentle voice perfect for relaxing content', 'ai', 'female', 'american', 'premium', 6),
('aria', 'Aria', 'Professional female voice with excellent clarity', 'ai', 'female', 'british', 'premium', 7),
('roger', 'Roger', 'Confident male voice with natural intonation', 'ai', 'male', 'british', 'premium', 8);