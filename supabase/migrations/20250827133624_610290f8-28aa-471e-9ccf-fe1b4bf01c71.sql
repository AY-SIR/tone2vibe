-- Reset word_balance to 0 for ALL users (Pro, Premium, Free)
-- word_balance should only contain actually purchased extra words
UPDATE public.profiles 
SET word_balance = 0;

-- Add a comment to clarify what word_balance represents
COMMENT ON COLUMN public.profiles.word_balance IS 'Extra words purchased by user that never expire. Should be 0 until user actually purchases extra words.';