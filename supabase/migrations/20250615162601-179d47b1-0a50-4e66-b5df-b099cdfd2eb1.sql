
-- Create processing queue table for background jobs
CREATE TABLE public.processing_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  job_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  progress INTEGER DEFAULT 0,
  job_data JSONB,
  result_data JSONB,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create realtime sessions table for active user sessions
CREATE TABLE public.realtime_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  session_type TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_activity TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  session_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create voice processing status table for live updates
CREATE TABLE public.voice_processing_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  project_id UUID REFERENCES public.projects,
  processing_stage TEXT NOT NULL,
  progress_percentage INTEGER DEFAULT 0,
  estimated_completion TIMESTAMP WITH TIME ZONE,
  status_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create collaboration sessions table for shared projects
CREATE TABLE public.collaboration_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects NOT NULL,
  owner_id UUID REFERENCES auth.users NOT NULL,
  collaborator_id UUID REFERENCES auth.users,
  permission_level TEXT NOT NULL DEFAULT 'view',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.processing_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.realtime_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_processing_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaboration_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for processing_queue
CREATE POLICY "Users can view their own processing jobs" 
  ON public.processing_queue 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own processing jobs" 
  ON public.processing_queue 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own processing jobs" 
  ON public.processing_queue 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Create RLS policies for realtime_sessions
CREATE POLICY "Users can view their own realtime sessions" 
  ON public.realtime_sessions 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own realtime sessions" 
  ON public.realtime_sessions 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own realtime sessions" 
  ON public.realtime_sessions 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Create RLS policies for voice_processing_status
CREATE POLICY "Users can view their own voice processing status" 
  ON public.voice_processing_status 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own voice processing status" 
  ON public.voice_processing_status 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own voice processing status" 
  ON public.voice_processing_status 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Create RLS policies for collaboration_sessions
CREATE POLICY "Users can view collaboration sessions they own or participate in" 
  ON public.collaboration_sessions 
  FOR SELECT 
  USING (auth.uid() = owner_id OR auth.uid() = collaborator_id);

CREATE POLICY "Users can create collaboration sessions for their own projects" 
  ON public.collaboration_sessions 
  FOR INSERT 
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update collaboration sessions they own" 
  ON public.collaboration_sessions 
  FOR UPDATE 
  USING (auth.uid() = owner_id);

-- Enable realtime for all new tables
ALTER TABLE public.processing_queue REPLICA IDENTITY FULL;
ALTER TABLE public.realtime_sessions REPLICA IDENTITY FULL;
ALTER TABLE public.voice_processing_status REPLICA IDENTITY FULL;
ALTER TABLE public.collaboration_sessions REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.processing_queue;
ALTER PUBLICATION supabase_realtime ADD TABLE public.realtime_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.voice_processing_status;
ALTER PUBLICATION supabase_realtime ADD TABLE public.collaboration_sessions;

-- Create function to update processing queue progress
CREATE OR REPLACE FUNCTION public.update_processing_progress(
  job_id UUID, 
  new_progress INTEGER, 
  new_status TEXT DEFAULT NULL,
  status_message TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.processing_queue 
  SET 
    progress = new_progress,
    status = COALESCE(new_status, status),
    error_message = COALESCE(status_message, error_message),
    updated_at = NOW(),
    completed_at = CASE WHEN new_progress = 100 THEN NOW() ELSE completed_at END
  WHERE id = job_id;
END;
$$;

-- Create function to clean up old sessions
CREATE OR REPLACE FUNCTION public.cleanup_old_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Mark sessions as inactive if no activity for more than 1 hour
  UPDATE public.realtime_sessions 
  SET is_active = false
  WHERE last_activity < (NOW() - INTERVAL '1 hour') 
    AND is_active = true;
    
  -- Delete very old sessions (older than 24 hours)
  DELETE FROM public.realtime_sessions 
  WHERE created_at < (NOW() - INTERVAL '24 hours');
END;
$$;
