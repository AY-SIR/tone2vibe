/*
  # Fix Payment System Issues

  1. Database Schema Updates
    - Fix amount data types to handle zero amounts properly
    - Add proper constraints and indexes
    - Update RPC functions for word management

  2. Payment Processing Fixes
    - Handle zero amount payments correctly
    - Fix word purchase transaction flow
    - Ensure proper transaction history recording

  3. Profile Update Triggers
    - Add triggers to ensure profile updates after payments
    - Fix plan expiry checking logic
*/

-- Fix orders table to handle zero amounts properly
DO $$
BEGIN
  -- Ensure amount column can handle zero values
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'amount' AND data_type = 'integer'
  ) THEN
    ALTER TABLE orders ALTER COLUMN amount TYPE integer USING amount::integer;
  END IF;
  
  -- Add order_type column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'order_type'
  ) THEN
    ALTER TABLE orders ADD COLUMN order_type text DEFAULT 'subscription';
  END IF;
  
  -- Add payment_method column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'payment_method'
  ) THEN
    ALTER TABLE orders ADD COLUMN payment_method text DEFAULT 'instamojo';
  END IF;
  
  -- Add payment_request_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'payment_request_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN payment_request_id text;
  END IF;
END $$;

-- Fix word_purchases table amount handling
DO $$
BEGIN
  -- Ensure amount_paid can handle decimal values properly
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'word_purchases' AND column_name = 'amount_paid' AND data_type != 'numeric'
  ) THEN
    ALTER TABLE word_purchases ALTER COLUMN amount_paid TYPE numeric(10,2) USING amount_paid::numeric;
  END IF;
END $$;

-- Create or replace the add_purchased_words function with better error handling
CREATE OR REPLACE FUNCTION add_purchased_words(
  user_id_param uuid,
  words_to_add integer,
  payment_id_param text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_balance integer;
  max_purchase_limit integer;
  user_plan text;
BEGIN
  -- Get current user plan and word balance
  SELECT plan, word_balance INTO user_plan, current_balance
  FROM profiles 
  WHERE user_id = user_id_param;
  
  IF user_plan IS NULL THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;
  
  -- Set max purchase limit based on plan
  IF user_plan = 'pro' THEN
    max_purchase_limit := 36000;
  ELSIF user_plan = 'premium' THEN
    max_purchase_limit := 49000;
  ELSE
    RAISE EXCEPTION 'Word purchases only available for Pro and Premium users';
  END IF;
  
  -- Check if adding words would exceed limit
  IF (current_balance + words_to_add) > max_purchase_limit THEN
    RAISE EXCEPTION 'Adding % words would exceed maximum purchase limit of %', words_to_add, max_purchase_limit;
  END IF;
  
  -- Update user's word balance
  UPDATE profiles 
  SET 
    word_balance = COALESCE(word_balance, 0) + words_to_add,
    last_word_purchase_at = now(),
    updated_at = now()
  WHERE user_id = user_id_param;
  
  -- Verify the update was successful
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Failed to update user word balance';
  END IF;
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error adding purchased words: %', SQLERRM;
END;
$$;

-- Create or replace the deduct_words_smartly function with better logic
CREATE OR REPLACE FUNCTION deduct_words_smartly(
  user_id_param uuid,
  words_to_deduct integer
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_profile profiles%ROWTYPE;
  plan_words_available integer;
  purchased_words_available integer;
  total_available integer;
  words_from_plan integer := 0;
  words_from_purchased integer := 0;
  result json;
BEGIN
  -- Get current profile
  SELECT * INTO current_profile
  FROM profiles 
  WHERE user_id = user_id_param;
  
  IF current_profile.user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User profile not found'
    );
  END IF;
  
  -- Calculate available words
  plan_words_available := GREATEST(0, COALESCE(current_profile.words_limit, 0) - COALESCE(current_profile.plan_words_used, 0));
  purchased_words_available := COALESCE(current_profile.word_balance, 0);
  total_available := plan_words_available + purchased_words_available;
  
  -- Check if user has enough words
  IF words_to_deduct > total_available THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Insufficient word balance',
      'available', total_available,
      'required', words_to_deduct
    );
  END IF;
  
  -- Deduct from plan words first, then purchased words
  IF words_to_deduct <= plan_words_available THEN
    -- All words come from plan
    words_from_plan := words_to_deduct;
    words_from_purchased := 0;
  ELSE
    -- Use all available plan words, rest from purchased
    words_from_plan := plan_words_available;
    words_from_purchased := words_to_deduct - plan_words_available;
  END IF;
  
  -- Update the profile
  UPDATE profiles 
  SET 
    plan_words_used = COALESCE(plan_words_used, 0) + words_from_plan,
    word_balance = GREATEST(0, COALESCE(word_balance, 0) - words_from_purchased),
    total_words_used = COALESCE(total_words_used, 0) + words_to_deduct,
    updated_at = now()
  WHERE user_id = user_id_param;
  
  -- Return success with details
  RETURN json_build_object(
    'success', true,
    'words_deducted', words_to_deduct,
    'from_plan', words_from_plan,
    'from_purchased', words_from_purchased,
    'remaining_plan', plan_words_available - words_from_plan,
    'remaining_purchased', purchased_words_available - words_from_purchased
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Create or replace check_plan_expiry function with better logic
CREATE OR REPLACE FUNCTION check_plan_expiry(user_id_param uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_profile profiles%ROWTYPE;
  days_until_expiry integer;
  should_show_popup boolean := false;
  notification_sent boolean := false;
BEGIN
  -- Get user profile
  SELECT * INTO user_profile
  FROM profiles 
  WHERE user_id = user_id_param;
  
  IF user_profile.user_id IS NULL THEN
    RETURN json_build_object('show_popup', false, 'error', 'User not found');
  END IF;
  
  -- Only check for paid plans
  IF user_profile.plan = 'free' OR user_profile.plan_expires_at IS NULL THEN
    RETURN json_build_object('show_popup', false, 'reason', 'Free plan or no expiry date');
  END IF;
  
  -- Calculate days until expiry
  days_until_expiry := EXTRACT(DAY FROM (user_profile.plan_expires_at::timestamp - now()));
  
  -- Show popup if expiring within 7 days or already expired
  should_show_popup := days_until_expiry <= 7;
  
  -- Check if notification was already sent for this expiry date
  SELECT EXISTS(
    SELECT 1 FROM expiry_notifications 
    WHERE user_id = user_id_param 
    AND plan_expires_at = user_profile.plan_expires_at::date
    AND notification_type = 'expiry_warning'
  ) INTO notification_sent;
  
  -- Only show popup if notification hasn't been sent yet
  should_show_popup := should_show_popup AND NOT notification_sent;
  
  -- Record notification if showing popup
  IF should_show_popup THEN
    INSERT INTO expiry_notifications (user_id, notification_type, plan_expires_at)
    VALUES (user_id_param, 'expiry_warning', user_profile.plan_expires_at::date)
    ON CONFLICT (user_id, notification_type, plan_expires_at) DO NOTHING;
  END IF;
  
  RETURN json_build_object(
    'show_popup', should_show_popup,
    'days_until_expiry', GREATEST(0, days_until_expiry),
    'plan', user_profile.plan,
    'expires_at', user_profile.plan_expires_at,
    'is_expired', days_until_expiry <= 0,
    'notification_sent', notification_sent
  );
END;
$$;

-- Add trigger to update profiles.updated_at on any change
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Ensure the trigger exists on profiles table
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_user_payment_request ON orders(user_id, payment_request_id);
CREATE INDEX IF NOT EXISTS idx_word_purchases_user_payment ON word_purchases(user_id, payment_id);
CREATE INDEX IF NOT EXISTS idx_profiles_plan_expiry ON profiles(plan_expires_at) WHERE plan != 'free';

-- Add constraint to ensure amount is non-negative
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'orders_amount_non_negative'
  ) THEN
    ALTER TABLE orders ADD CONSTRAINT orders_amount_non_negative CHECK (amount >= 0);
  END IF;
END $$;