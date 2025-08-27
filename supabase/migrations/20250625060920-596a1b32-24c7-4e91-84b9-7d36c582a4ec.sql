
-- Fix word limits for plans
UPDATE public.profiles 
SET words_limit = 41000 
WHERE plan = 'pro';

UPDATE public.profiles 
SET words_limit = 99999 
WHERE plan = 'premium';

-- Update the upgrade function to use correct limits
CREATE OR REPLACE FUNCTION public.upgrade_user_plan(p_user_id uuid, p_plan text, p_payment_id text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  UPDATE public.profiles 
  SET 
    plan = p_plan::user_plan,
    words_limit = CASE 
      WHEN p_plan = 'pro' THEN 41000
      WHEN p_plan = 'premium' THEN 99999
      ELSE words_limit
    END,
    upload_limit_mb = CASE 
      WHEN p_plan = 'pro' THEN 25
      WHEN p_plan = 'premium' THEN 100
      ELSE upload_limit_mb
    END,
    max_word_purchase_limit = CASE 
      WHEN p_plan = 'pro' THEN 41000
      WHEN p_plan = 'premium' THEN 99999
      ELSE max_word_purchase_limit
    END,
    plan_expires_at = now() + INTERVAL '30 days',
    updated_at = now()
  WHERE id = p_user_id;
  
  -- Record payment if provided
  IF p_payment_id IS NOT NULL THEN
    INSERT INTO public.payments (user_id, plan, amount, payment_id, status, currency)
    VALUES (
      p_user_id, 
      p_plan::user_plan, 
      CASE WHEN p_plan = 'pro' THEN 9900 ELSE 29900 END,
      p_payment_id,
      'paid',
      'INR'
    );
  END IF;
END;
$function$;

-- Add more prebuilt voices for different plans
INSERT INTO public.prebuilt_voices (voice_id, name, gender, accent, category, description, required_plan) VALUES
-- Free plan voices (50+)
('voice_free_01', 'Emma', 'female', 'American', 'News', 'Professional news anchor voice', 'free'),
('voice_free_02', 'James', 'male', 'British', 'Corporate', 'Business presentation voice', 'free'),
('voice_free_03', 'Sofia', 'female', 'Spanish', 'Education', 'Clear educational content voice', 'free'),
('voice_free_04', 'Chen', 'male', 'Chinese', 'Technology', 'Modern tech voice', 'free'),
('voice_free_05', 'Priya', 'female', 'Indian', 'Casual', 'Friendly conversational voice', 'free'),
('voice_free_06', 'Alex', 'male', 'Canadian', 'Storytelling', 'Engaging narrator voice', 'free'),
('voice_free_07', 'Maria', 'female', 'Mexican', 'Entertainment', 'Lively entertainment voice', 'free'),
('voice_free_08', 'David', 'male', 'Australian', 'Sports', 'Energetic sports commentary', 'free'),
('voice_free_09', 'Anna', 'female', 'German', 'Documentary', 'Authoritative documentary voice', 'free'),
('voice_free_10', 'Pierre', 'male', 'French', 'Art', 'Sophisticated cultural voice', 'free'),
('voice_free_11', 'Yuki', 'female', 'Japanese', 'Anime', 'Expressive character voice', 'free'),
('voice_free_12', 'Marco', 'male', 'Italian', 'Cooking', 'Passionate culinary voice', 'free'),
('voice_free_13', 'Ingrid', 'female', 'Swedish', 'Wellness', 'Calm meditation voice', 'free'),
('voice_free_14', 'Hans', 'male', 'Dutch', 'History', 'Educational historian voice', 'free'),
('voice_free_15', 'Elena', 'female', 'Russian', 'Drama', 'Theatrical performance voice', 'free'),
('voice_free_16', 'Ahmed', 'male', 'Arabic', 'News', 'International news voice', 'free'),
('voice_free_17', 'Fatima', 'female', 'Arabic', 'Education', 'Educational content voice', 'free'),
('voice_free_18', 'João', 'male', 'Portuguese', 'Sports', 'Football commentary voice', 'free'),
('voice_free_19', 'Isabela', 'female', 'Brazilian', 'Music', 'Musical content voice', 'free'),
('voice_free_20', 'Viktor', 'male', 'Polish', 'Technology', 'Tech tutorial voice', 'free'),
('voice_free_21', 'Katarina', 'female', 'Czech', 'Travel', 'Travel guide voice', 'free'),
('voice_free_22', 'Nikolai', 'male', 'Bulgarian', 'Business', 'Corporate training voice', 'free'),
('voice_free_23', 'Anastasia', 'female', 'Ukrainian', 'Healthcare', 'Medical information voice', 'free'),
('voice_free_24', 'Dimitri', 'male', 'Greek', 'Philosophy', 'Thoughtful academic voice', 'free'),
('voice_free_25', 'Zara', 'female', 'Turkish', 'Lifestyle', 'Lifestyle content voice', 'free'),
('voice_free_26', 'Omar', 'male', 'Egyptian', 'Culture', 'Cultural storytelling voice', 'free'),
('voice_free_27', 'Leila', 'female', 'Persian', 'Poetry', 'Poetic recitation voice', 'free'),
('voice_free_28', 'Arjun', 'male', 'Hindi', 'Bollywood', 'Entertainment voice', 'free'),
('voice_free_29', 'Sakura', 'female', 'Korean', 'K-pop', 'Modern youth voice', 'free'),
('voice_free_30', 'Raj', 'male', 'Tamil', 'Cinema', 'Movie trailer voice', 'free'),
('voice_free_31', 'Mei', 'female', 'Mandarin', 'Business', 'Professional voice', 'free'),
('voice_free_32', 'Akira', 'male', 'Japanese', 'Gaming', 'Gaming content voice', 'free'),
('voice_free_33', 'Luna', 'female', 'Filipino', 'Vlog', 'Personal vlog voice', 'free'),
('voice_free_34', 'Kai', 'male', 'Thai', 'Food', 'Cooking show voice', 'free'),
('voice_free_35', 'Siti', 'female', 'Malaysian', 'Tourism', 'Tourism promotion voice', 'free'),
('voice_free_36', 'Budi', 'male', 'Indonesian', 'Education', 'Online learning voice', 'free'),
('voice_free_37', 'Linh', 'female', 'Vietnamese', 'News', 'Local news voice', 'free'),
('voice_free_38', 'Tenzin', 'male', 'Tibetan', 'Meditation', 'Spiritual guidance voice', 'free'),
('voice_free_39', 'Nyima', 'female', 'Tibetan', 'Culture', 'Cultural preservation voice', 'free'),
('voice_free_40', 'Karma', 'male', 'Nepali', 'Adventure', 'Mountain guide voice', 'free'),
('voice_free_41', 'Maya', 'female', 'Bengali', 'Literature', 'Literary content voice', 'free'),
('voice_free_42', 'Ravi', 'male', 'Gujarati', 'Business', 'Entrepreneurship voice', 'free'),
('voice_free_43', 'Kavya', 'female', 'Telugu', 'Entertainment', 'Regional entertainment voice', 'free'),
('voice_free_44', 'Arun', 'male', 'Kannada', 'Technology', 'IT training voice', 'free'),
('voice_free_45', 'Deepika', 'female', 'Malayalam', 'Health', 'Healthcare advice voice', 'free'),
('voice_free_46', 'Vikram', 'male', 'Punjabi', 'Music', 'Music content voice', 'free'),
('voice_free_47', 'Simran', 'female', 'Marathi', 'Drama', 'Theater performance voice', 'free'),
('voice_free_48', 'Rohan', 'male', 'Urdu', 'Poetry', 'Urdu poetry voice', 'free'),
('voice_free_49', 'Aaliya', 'female', 'Sindhi', 'Culture', 'Cultural content voice', 'free'),
('voice_free_50', 'Karan', 'male', 'Kashmiri', 'Nature', 'Nature documentary voice', 'free'),

-- Pro plan additional voices
('voice_pro_01', 'Victoria', 'female', 'British', 'Luxury', 'Premium brand voice', 'pro'),
('voice_pro_02', 'Sebastian', 'male', 'American', 'CEO', 'Executive presentation voice', 'pro'),
('voice_pro_03', 'Claudia', 'female', 'Italian', 'Fashion', 'Fashion industry voice', 'pro'),
('voice_pro_04', 'Laurent', 'male', 'French', 'Wine', 'Sommelier expertise voice', 'pro'),
('voice_pro_05', 'Sophia', 'female', 'Greek', 'Academia', 'University lecture voice', 'pro'),

-- Premium plan exclusive voices
('voice_premium_01', 'Elizabeth', 'female', 'Royal British', 'Luxury', 'Royal announcement voice', 'premium'),
('voice_premium_02', 'Alexander', 'male', 'Oxford', 'Academic', 'Oxford professor voice', 'premium'),
('voice_premium_03', 'Isabella', 'female', 'Parisian', 'Art', 'Art gallery curator voice', 'premium'),
('voice_premium_04', 'Maximilian', 'male', 'Viennese', 'Classical', 'Classical music voice', 'premium'),
('voice_premium_05', 'Anastasia', 'female', 'Moscow', 'Literature', 'Literary criticism voice', 'premium');

-- Enable RLS for prebuilt_voices if not already enabled
ALTER TABLE public.prebuilt_voices ENABLE ROW LEVEL SECURITY;

-- Create policy for prebuilt voices (public read access)
CREATE POLICY "Public can view prebuilt voices" 
  ON public.prebuilt_voices 
  FOR SELECT 
  USING (true);
