
-- Create word_purchases table if it doesn't exist (it should already exist based on the schema)
-- But let's make sure it has all the required columns
ALTER TABLE word_purchases 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed';

-- Create an index for faster queries on user_id
CREATE INDEX IF NOT EXISTS idx_word_purchases_user_id ON word_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_word_purchases_created_at ON word_purchases(created_at DESC);

-- Create an index for payments table as well for the payment history
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);

-- Enable RLS on word_purchases if not already enabled
ALTER TABLE word_purchases ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Users can view their own word purchases" ON word_purchases;
DROP POLICY IF EXISTS "Users can insert their own word purchases" ON word_purchases;

-- Create RLS policies for word_purchases
CREATE POLICY "Users can view their own word purchases" 
ON word_purchases FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own word purchases" 
ON word_purchases FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Enable RLS on payments if not already enabled  
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Users can view their own payments" ON payments;
DROP POLICY IF EXISTS "Users can insert their own payments" ON payments;

-- Create RLS policies for payments
CREATE POLICY "Users can view their own payments" 
ON payments FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own payments" 
ON payments FOR INSERT 
WITH CHECK (auth.uid() = user_id);
