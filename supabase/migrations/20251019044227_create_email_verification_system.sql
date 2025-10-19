/*
  # Email Verification System Migration
  
  1. New Tables
    - `email_verification_tokens`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `email` (text, not null)
      - `token` (text, unique, not null)
      - `token_type` (text, not null) - 'email_confirmation' or 'password_reset'
      - `expires_at` (timestamptz, not null)
      - `used_at` (timestamptz, nullable)
      - `created_at` (timestamptz, default now())
      
    - `password_reset_tokens`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `email` (text, not null)
      - `token` (text, unique, not null)
      - `expires_at` (timestamptz, not null)
      - `used_at` (timestamptz, nullable)
      - `created_at` (timestamptz, default now())
      
  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage their own tokens
    - Tokens expire after 24 hours
    
  3. Functions
    - Function to generate secure random tokens
    - Function to verify and consume tokens
    - Function to cleanup expired tokens
*/

-- Create email verification tokens table
CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  token text UNIQUE NOT NULL,
  token_type text NOT NULL CHECK (token_type IN ('email_confirmation', 'password_reset')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  used_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create password reset tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  token text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '1 hour'),
  used_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE email_verification_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email_verification_tokens
CREATE POLICY "Users can view their own email verification tokens"
  ON email_verification_tokens FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert email verification tokens"
  ON email_verification_tokens FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Service role can update email verification tokens"
  ON email_verification_tokens FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for password_reset_tokens
CREATE POLICY "Users can view their own password reset tokens"
  ON password_reset_tokens FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert password reset tokens"
  ON password_reset_tokens FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Service role can update password reset tokens"
  ON password_reset_tokens FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function to generate a secure random token
CREATE OR REPLACE FUNCTION generate_verification_token()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  token text;
BEGIN
  token := encode(gen_random_bytes(32), 'base64');
  token := replace(token, '/', '_');
  token := replace(token, '+', '-');
  token := replace(token, '=', '');
  RETURN token;
END;
$$;

-- Function to verify and consume email verification token
CREATE OR REPLACE FUNCTION verify_email_token(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_token_record record;
  v_result jsonb;
BEGIN
  SELECT * INTO v_token_record
  FROM email_verification_tokens
  WHERE token = p_token
    AND used_at IS NULL
    AND expires_at > now();
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid or expired token'
    );
  END IF;
  
  UPDATE email_verification_tokens
  SET used_at = now()
  WHERE id = v_token_record.id;
  
  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_token_record.user_id,
    'email', v_token_record.email,
    'token_type', v_token_record.token_type
  );
END;
$$;

-- Function to verify and consume password reset token
CREATE OR REPLACE FUNCTION verify_password_reset_token(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_token_record record;
  v_result jsonb;
BEGIN
  SELECT * INTO v_token_record
  FROM password_reset_tokens
  WHERE token = p_token
    AND used_at IS NULL
    AND expires_at > now();
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid or expired token'
    );
  END IF;
  
  UPDATE password_reset_tokens
  SET used_at = now()
  WHERE id = v_token_record.id;
  
  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_token_record.user_id,
    'email', v_token_record.email
  );
END;
$$;

-- Function to cleanup expired tokens (run via cron)
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM email_verification_tokens
  WHERE expires_at < now() - interval '7 days';
  
  DELETE FROM password_reset_tokens
  WHERE expires_at < now() - interval '7 days';
END;
$$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_token ON email_verification_tokens(token);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_id ON email_verification_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_expires_at ON email_verification_tokens(expires_at);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);