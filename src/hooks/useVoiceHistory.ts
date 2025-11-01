import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface VoiceProject {
  id: string;
  title: string;
  original_text: string;
  language: string;
  word_count: number;
  audio_url: string;
  created_at: string;
  voice_settings: any;
  processing_time_ms?: number;
  generation_started_at?: string;
  generation_completed_at?: string;
  duration_seconds?: number; // Added this
}

export const useVoiceHistory = () => {
  const { user, profile } = useAuth();
  const [projects, setProjects] = useState<VoiceProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getVoiceLimit = (voiceType: 'generated' | 'recorded' = 'generated') => {
    if (voiceType === 'recorded') {
      switch (profile?.plan) {
        case 'pro': return 30;
        case 'premium': return 90;
        default: return 7;
      }
    } else {
      switch (profile?.plan) {
        case 'pro': return 30;
        case 'premium': return 90;
        default: return 7;
      }
    }
  };

  const fetchVoiceHistory = async (filterType: 'generated' | 'recorded' | 'all' = 'all') => {
    if (!user || !profile) return;

    setLoading(true);
    setError(null);

    try {
      const nowIso = new Date().toISOString();

      const { data, error } = await supabase
        .from('history')
        .select(`
          id, title, original_text, language, words_used, audio_url,
          created_at, voice_settings, processing_time_ms,
          generation_started_at, generation_completed_at,
          duration_seconds
        `)
        .eq('user_id', user.id)
        .not('audio_url', 'is', null)
        .order('created_at', { ascending: false });

      if (error) {
        setError('Failed to load voice history');
        return;
      }

      const mappedProjects = (data || [])
        .filter(item => {
          const voiceSettings = item.voice_settings as any;
          const isSample = voiceSettings &&
            typeof voiceSettings === 'object' &&
            voiceSettings !== null &&
            'is_sample' in voiceSettings &&
            voiceSettings.is_sample === true;
          return !isSample;
        })
        .map(item => ({
          id: item.id,
          title: item.title || `Voice${item.id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8)}`,
          original_text: item.original_text,
          language: item.language,
          word_count: item.words_used,
          audio_url: item.audio_url || '',
          created_at: item.created_at,
          voice_settings: item.voice_settings as any,
          processing_time_ms: item.processing_time_ms || 0,
          generation_started_at: item.generation_started_at || item.created_at,
          generation_completed_at: item.generation_completed_at || item.created_at,
          duration_seconds: item.duration_seconds || 0
        }));

      // Remove duplicates based on ID
      const uniqueProjects = mappedProjects.filter((project, index, self) => {
        return index === self.findIndex(p => p.id === project.id);
      });

      setProjects(uniqueProjects);
    } catch (err) {
      console.error(err);
      setError('Failed to load voice history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVoiceHistory();

    if (user) {
      // Real-time updates for INSERT and DELETE
      const historyChannel = supabase
        .channel('history-updates')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'history',
            filter: `user_id=eq.${user.id}`
          },
          () => fetchVoiceHistory()
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'history',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            setProjects(prev => prev.filter(p => p.id !== payload.old.id));
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(historyChannel);
      };
    }
  }, [user?.id, profile?.plan]);

  const selectProject = async (projectId: string) => {
    console.log('Selected project:', projectId);
    return true;
  };

  const getRetentionInfo = (voiceType: 'generated' | 'recorded' | 'all' = 'generated') => {
    const plan = profile?.plan || 'free';
    switch (plan) {
      case 'pro': return '30 days';
      case 'premium': return '90 days';
      default: return '7 days';
    }
  };

  return {
    projects,
    loading,
    error,
    selectProject,
    refreshHistory: fetchVoiceHistory,
    retentionInfo: getRetentionInfo,
    voiceLimit: getVoiceLimit
  };
};
