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
}

export const useVoiceHistory = () => {
  const { user, profile } = useAuth();
  const [projects, setProjects] = useState<VoiceProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getHistoryRetentionDate = () => {
    const now = new Date();
    
    switch (profile?.plan) {
      case 'free':
        // 7 days for free users
        now.setDate(now.getDate() - 7);
        break;
      case 'pro':
        // 30 days
        now.setDate(now.getDate() - 30);
        break;
      case 'premium':
        // 90 days
        now.setDate(now.getDate() - 90);
        break;
      default:
        // Default to 7 days for unknown plans
        now.setDate(now.getDate() - 7);
    }
    
    return now.toISOString();
  };

  const getVoiceLimit = () => {
    switch (profile?.plan) {
      case 'free':
        return 3; // Last 3 voices only
      case 'pro':
        return 30; // Last 30 voices
      case 'premium':
        return 90; // Last 90 voices
      default:
        return 3;
    }
  };

  const fetchVoiceHistory = async () => {
    if (!user || !profile) return;

    setLoading(true);
    setError(null);

    try {
      const retentionDate = getHistoryRetentionDate();
      const voiceLimit = getVoiceLimit();
      
      console.log(`Fetching voice history for ${profile.plan} plan since ${retentionDate}, limit: ${voiceLimit}`);

      // Use the existing 'history' table and prevent duplicates, exclude samples
      const { data, error } = await supabase
        .from('history')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', retentionDate)
        .order('created_at', { ascending: false })
        .limit(voiceLimit);

      if (error) {
        console.error('Error fetching voice history:', error);
        setError('Failed to load voice history');
        return;
      }

      console.log(`Loaded ${data?.length || 0} voice projects for ${profile.plan} plan`);
      
      // Map history data to VoiceProject format and remove duplicates + samples
      const mappedProjects = (data || [])
        .filter(item => {
          // Filter out samples by checking voice_settings
          const voiceSettings = item.voice_settings;
          // Check if voice_settings is an object and has is_sample set to true
          return !(
            voiceSettings && 
            typeof voiceSettings === 'object' && 
            voiceSettings !== null &&
            'is_sample' in voiceSettings && 
            voiceSettings.is_sample === true
          );
        })
        .map(item => ({
          id: item.id,
          title: item.title,
          original_text: item.original_text,
          language: item.language,
          word_count: item.words_used,
          audio_url: item.audio_url || '',
          created_at: item.created_at,
          voice_settings: item.voice_settings
        }));
      
      // Remove duplicates based on id (most reliable) or creation timestamp
      const uniqueProjects = mappedProjects.filter((project, index, self) => {
        return index === self.findIndex(p => p.id === project.id);
      });
      
      setProjects(uniqueProjects);
    } catch (err) {
      console.error('Error in fetchVoiceHistory:', err);
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
            console.log('New history entry added:', payload.new);
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
            console.log('History entry deleted:', payload.old);
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

  const getRetentionInfo = () => {
    switch (profile?.plan) {
      case 'free':
        return '7 days (last 3 voices)';
      case 'pro':
        return '30 days (last 30 voices)';
      case 'premium':
        return '90 days (last 90 voices)';
      default:
        return '7 days (last 3 voices)';
    }
  };

  return {
    projects,
    loading,
    error,
    selectProject,
    refreshHistory: fetchVoiceHistory,
    retentionInfo: getRetentionInfo(),
    voiceLimit: getVoiceLimit()
  };
};