-- Remove USD/international support and unused tables
-- Keep only India/INR related data

-- Remove USD pricing and add only INR
DELETE FROM plans WHERE currency != 'INR';

-- Add Indian-only plans if not exist
INSERT INTO plans (name, price, original_price, word_limit, currency, features) VALUES
('Free', 0, 0, 1000, 'INR', '["1,000 words/month", "Basic voices", "7-day history", "Community support"]'),
('Pro', 99, 149, 10000, 'INR', '["10,000 words/month", "Advanced voices", "30-day history", "Email support", "Custom voices"]'),
('Premium', 299, 399, 50000, 'INR', '["50,000 words/month", "Premium AI voices", "90-day history", "Priority support", "Advanced analytics"]')
ON CONFLICT (name, currency) DO UPDATE SET
price = EXCLUDED.price,
original_price = EXCLUDED.original_price,
word_limit = EXCLUDED.word_limit,
features = EXCLUDED.features;

-- Update existing profiles to have India as country
UPDATE profiles SET country = 'India' WHERE country IS NULL OR country = '';

-- Add VPN detection columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_vpn_user boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_ip_check timestamp with time zone;

-- Add language preference
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ui_language text DEFAULT 'en';

-- Create a table for VPN detection results
CREATE TABLE IF NOT EXISTS vpn_detections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address inet NOT NULL,
  is_vpn boolean NOT NULL DEFAULT false,
  detection_result jsonb,
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone DEFAULT (now() + interval '24 hours')
);

-- Add index for VPN detection
CREATE INDEX IF NOT EXISTS idx_vpn_detections_ip ON vpn_detections(ip_address);
CREATE INDEX IF NOT EXISTS idx_vpn_detections_expires ON vpn_detections(expires_at);

-- Remove international data and ensure only Indian users
DELETE FROM ip_tracking WHERE country_code != 'IN' AND country_code IS NOT NULL;

-- Add constraint to ensure only Indian users can register
CREATE OR REPLACE FUNCTION check_indian_user_only()
RETURNS trigger AS $$
BEGIN
  -- Only allow Indian users
  IF NEW.country IS NOT NULL AND NEW.country != 'India' THEN
    RAISE EXCEPTION 'Service only available in India';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for Indian-only registration
DROP TRIGGER IF EXISTS enforce_indian_only ON profiles;
CREATE TRIGGER enforce_indian_only
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION check_indian_user_only();