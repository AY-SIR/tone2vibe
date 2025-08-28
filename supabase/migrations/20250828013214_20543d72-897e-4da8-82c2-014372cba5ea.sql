-- Add time tracking columns to history table
ALTER TABLE public.history 
ADD COLUMN IF NOT EXISTS processing_time_ms INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS generation_started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN IF NOT EXISTS generation_completed_at TIMESTAMP WITH TIME ZONE;