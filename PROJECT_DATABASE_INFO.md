# Project Database Tables & Edge Functions

## Database Tables Being Used

### 1. **profiles** 
Main user profile table
- Stores user information, plan details, word balances
- Fields: user_id, full_name, email, plan, words_limit, word_balance, plan_words_used, total_words_used, upload_limit_mb, plan_start_date, plan_expires_at

### 2. **history**
Voice generation history
- Stores all AI-generated voice projects
- Fields: id, user_id, title, original_text, language, words_used, audio_url, voice_settings, created_at, processing_time_ms

### 3. **user_voices**
Recorded voice storage
- Stores user-recorded voice samples
- Fields: id, user_id, name, audio_url, duration, created_at, file_size

### 4. **word_purchases**
Word purchase transactions
- Tracks all word pack purchases
- Fields: id, user_id, words_purchased, amount_paid, payment_id, status, created_at

### 5. **banned_emails**
Email blacklist
- Prevents banned emails from signing up
- Fields: email, reason, created_at

## Edge Functions Being Used

### 1. **generate-voice**
Main AI voice generation
- Generates full-length voice from text
- Deducts words from user balance
- Returns audio URL

### 2. **generate-sample-voice**
Sample voice generation
- Generates 50-word preview sample
- Free - no words deducted
- Used for voice preview

### 3. **generate-fallback-voice**
Fallback voice generation
- Backup system when main generation fails
- Ensures users always get output

### 4. **generate-fallback-sample**
Fallback sample generation
- Backup for sample generation
- Ensures preview is always available

### 5. **activate-free-plan**
Plan activation
- Activates free plan for new users
- Sets initial word limits

### 6. **create-instamojo-payment**
Payment creation
- Creates Instamojo payment requests
- For Indian users only

### 7. **verify-instamojo-payment**
Payment verification
- Verifies Instamojo payments
- Updates user balances

### 8. **delete-account**
Account deletion
- Handles complete account deletion
- Removes all user data

## Storage Buckets

### 1. **user-voices** (Private)
- Stores recorded voice samples
- Files: `{user_id}/{timestamp}-{name}.webm`

### 2. **user-generates** (Private)
- Stores AI-generated audio files
- Files: `{user_id}/{timestamp}-{title}.mp3`

## Tables You Can Safely Delete

If you're not using these features, you can delete:
- **banned_emails** (if not using email restrictions)
- Any custom tables you created for testing

## Important Notes

1. **Never delete**: profiles, history, user_voices, word_purchases
2. **Edge functions in use**: All 8 listed above are active
3. **Storage buckets**: Both are required for functionality
4. **RLS Policies**: All tables have Row Level Security enabled

## Word Balance System

- **Plan Words**: Reset monthly, limited by plan
- **Purchased Words**: Never expire, unlimited
- **Deduction Order**: Plan words first, then purchased words
