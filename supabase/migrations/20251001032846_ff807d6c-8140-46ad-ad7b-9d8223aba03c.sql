-- Ensure coupons table has all required columns
DO $$ 
BEGIN
  -- Add active column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'coupons' 
                 AND column_name = 'active') THEN
    ALTER TABLE public.coupons ADD COLUMN active BOOLEAN NOT NULL DEFAULT true;
  END IF;

  -- Add max_uses column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'coupons' 
                 AND column_name = 'max_uses') THEN
    ALTER TABLE public.coupons ADD COLUMN max_uses INTEGER;
  END IF;

  -- Add used_count column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'coupons' 
                 AND column_name = 'used_count') THEN
    ALTER TABLE public.coupons ADD COLUMN used_count INTEGER NOT NULL DEFAULT 0;
  END IF;

  -- Add last_used_at column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'coupons' 
                 AND column_name = 'last_used_at') THEN
    ALTER TABLE public.coupons ADD COLUMN last_used_at TIMESTAMP WITHOUT TIME ZONE;
  END IF;
END $$;

-- Ensure user_voices table has audio_url column
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'user_voices' 
                 AND column_name = 'audio_url') THEN
    ALTER TABLE public.user_voices ADD COLUMN audio_url TEXT;
  END IF;
END $$;

-- Ensure prebuilt_voices table has language column
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'prebuilt_voices' 
                 AND column_name = 'language') THEN
    ALTER TABLE public.prebuilt_voices ADD COLUMN language TEXT NOT NULL DEFAULT 'hi';
  END IF;
END $$;