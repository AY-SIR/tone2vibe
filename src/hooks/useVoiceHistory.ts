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
}

export const useVoiceHistory = () => {
  const { user, profile } = useAuth();
  const [projects, setProjects] = useState<VoiceProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getHistoryRetentionDate = (voiceType: 'generated' | 'recorded' = 'generated') => {
    const now = new Date();
    
    if (voiceType === 'recorded') {
      // Recorded voices have separate retention
      switch (profile?.plan) {
        case 'free':
          now.setDate(now.getDate() - 7);
          break;
        case 'pro':
          now.setDate(now.getDate() - 30);
          break;
        case 'premium':
          now.setDate(now.getDate() - 90);
          break;
        default:
          now.setDate(now.getDate() - 7);
      }
    } else {
      // Generated voices retention
      switch (profile?.plan) {
        case 'free':
          now.setDate(now.getDate() - 7);
          break;
        case 'pro':
          now.setDate(now.getDate() - 30);
          break;
        case 'premium':
          now.setDate(now.getDate() - 90);
          break;
        default:
          now.setDate(now.getDate() - 7);
      }
    }
    
    return now.toISOString();
  };

  const getVoiceLimit = (voiceType: 'generated' | 'recorded' = 'generated') => {
    if (voiceType === 'recorded') {
      // Recorded voices limits
      switch (profile?.plan) {
        case 'free':
          return 7; // Last 7 recorded voices
        case 'pro':
          return 30; // Last 30 recorded voices
        case 'premium':
          return 90; // Last 90 recorded voices
        default:
          return 7;
      }
    } else {
      // Generated voices limits
      switch (profile?.plan) {
        case 'free':
          return 7; // Last 7 generated voices
        case 'pro':
          return 30; // Last 30 generated voices
        case 'premium':
          return 90; // Last 90 generated voices
        default:
          return 7;
      }
    }
  };

  const fetchVoiceHistory = async (filterType: 'generated' | 'recorded' | 'all' = 'all') => {
    if (!user || !profile) return;

    setLoading(true);
    setError(null);

    try {
      // Optimized: calculate limits first
      const generatedLimit = getVoiceLimit('generated');
      const recordedLimit = getVoiceLimit('recorded');
      const limit = filterType === 'all' ? Math.max(generatedLimit, recordedLimit) : 
                    filterType === 'generated' ? generatedLimit : recordedLimit;
      
      // Optimized query with minimal selection
      let query = supabase
        .from('history')
        .select('id, title, original_text, language, words_used, audio_url, created_at, voice_settings, processing_time_ms, generation_started_at, generation_completed_at')
        .eq('user_id', user.id)
        .not('audio_url', 'is', null)
        .order('created_at', { ascending: false })
        .limit(limit);

      const { data, error } = await query;

      if (error) {
        setError('Failed to load voice history');
        return;
      }

      // Removed sensitive logging
      
      // Map history data to VoiceProject format and remove duplicates + samples
      const mappedProjects = (data || [])
        .filter(item => {
          // Filter out samples by checking voice_settings
          const voiceSettings = item.voice_settings;
          // Check if voice_settings is an object and has is_sample set to true
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
          voice_settings: item.voice_settings,
          processing_time_ms: item.processing_time_ms,
          generation_started_at: item.generation_started_at,
          generation_completed_at: item.generation_completed_at
        }));
      
      // Remove duplicates based on id (most reliable) or creation timestamp
      const uniqueProjects = mappedProjects.filter((project, index, self) => {
        return index === self.findIndex(p => p.id === project.id);
      });
      
      setProjects(uniqueProjects);
    } catch (err) {
      setError('Failed to load voice history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVoiceHistory();
    
    if (user) {
      // Set up real-time subscription for history updates
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
          (payload) => {
            fetchVoiceHistory(); // Refresh the history
          }
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
    // This could be used to mark a project as selected for reuse
    console.log('Selected project:', projectId);
    return true;
  };

  const getRetentionInfo = (voiceType: 'generated' | 'recorded' | 'all' = 'generated') => {
    if (voiceType === 'recorded') {
      switch (profile?.plan) {
        case 'free':
          return '7 days (last 7 recorded voices)';
        case 'pro':
          return '30 days (last 30 recorded voices)';
        case 'premium':
          return '90 days (last 90 recorded voices)';
        default:
          return '7 days (last 7 recorded voices)';
      }
    } else if (voiceType === 'all') {
      switch (profile?.plan) {
        case 'free':
          return '7 days (combined voices)';
        case 'pro':
          return '30 days (combined voices)';
        case 'premium':
          return '90 days (combined voices)';
        default:
          return '7 days (combined voices)';
      }
    } else {
      switch (profile?.plan) {
        case 'free':
          return '7 days (last 7 generated voices)';
        case 'pro':
          return '30 days (last 30 generated voices)';
        case 'premium':
          return '90 days (last 90 generated voices)';
        default:
          return '7 days (last 7 generated voices)';
      }
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