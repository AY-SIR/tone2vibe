-- Remove USD-related tables and optimize for India-only service
-- Remove Stripe references from orders table
ALTER TABLE orders DROP COLUMN IF EXISTS stripe_session_id;

-- Update payment_settings to India-only - first delete non-Indian settings
DELETE FROM payment_settings WHERE country_code != 'IN';

-- Insert or update Indian payment settings
INSERT INTO payment_settings (country_code, currency, payment_gateway, allowed, created_at) 
VALUES ('IN', 'INR', 'instamojo', true, NOW());

-- Remove non-INR data from existing tables
UPDATE profiles SET country = 'India' WHERE country IS NULL OR country != 'India';
UPDATE payments SET currency = 'INR' WHERE currency != 'INR';
UPDATE word_purchases SET currency = 'INR' WHERE currency != 'INR';

-- Add language preference column for Hindi/English toggle
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ui_language TEXT DEFAULT 'en';

-- Add VPN detection and enhanced security
CREATE TABLE IF NOT EXISTS user_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  ip_address INET NOT NULL,
  country_code TEXT NOT NULL,
  country_name TEXT NOT NULL,
  city TEXT,
  region TEXT,
  is_vpn BOOLEAN DEFAULT false,
  vpn_provider TEXT,
  confidence_score INTEGER DEFAULT 100,
  last_checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on user_locations
ALTER TABLE user_locations ENABLE ROW LEVEL SECURITY;

-- Create policies for user_locations
CREATE POLICY "Users can view their own location data" 
ON user_locations FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Service can manage location data" 
ON user_locations FOR ALL 
USING (auth.role() = 'service_role');

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_locations_user_id ON user_locations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_locations_ip ON user_locations(ip_address);
CREATE INDEX IF NOT EXISTS idx_vpn_detections_ip ON vpn_detections(ip_address);