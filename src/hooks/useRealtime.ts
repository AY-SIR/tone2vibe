import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ProcessingJob {
  id: string;
  job_type: string;
  status: string;
  progress: number;
  job_data?: any;
  result_data?: any;
  error_message?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface VoiceProcessingStatus {
  id: string;
  project_id?: string;
  processing_stage: string;
  progress_percentage: number;
  estimated_completion?: string;
  status_message?: string;
  created_at: string;
  updated_at: string;
}

export const useRealtimeProcessing = () => {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<ProcessingJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id || user.id === 'guest') {
      setLoading(false);
      return;
    }

    // Since processing_queue table doesn't exist, we'll just return empty state
    // This can be extended when the table is created
    setJobs([]);
    setLoading(false);
  }, [user?.id]);

  return { jobs, loading };
};

export const useRealtimeVoiceProcessing = (projectId?: string) => {
  const { user } = useAuth();
  const [status, setStatus] = useState<VoiceProcessingStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id || user.id === 'guest') {
      setLoading(false);
      return;
    }

    // Since voice_processing_status table doesn't exist, we'll just return empty state
    // This can be extended when the table is created
    setStatus(null);
    setLoading(false);
  }, [user?.id, projectId]);

  return { status, loading };
};

export const useRealtimeProfile = () => {
  const { user, refreshProfile } = useAuth();

  useEffect(() => {
    if (!user?.id || user.id === 'guest') return;

    // Subscribe to profile changes
    const channel = supabase
      .channel('profile_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Profile update:', payload);
      refreshProfile();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, refreshProfile]);
};