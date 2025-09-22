import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export const useRealTimeWordCount = () => {
  const { user, profile, refreshProfile } = useAuth();
  const [realTimeWordsUsed, setRealTimeWordsUsed] = useState(0);

  useEffect(() => {
    if (!user || !profile) return;

    // Removed sensitive logging
    
    // Set initial value - show plan words used (not total)
    setRealTimeWordsUsed(profile.plan_words_used || 0);

    // Subscribe to real-time changes
    const channel = supabase
      .channel('word-count-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          if (payload.new && typeof payload.new.plan_words_used === 'number') {
            setRealTimeWordsUsed(payload.new.plan_words_used);
            // Always refresh profile to keep context in sync
            setTimeout(() => {
              refreshProfile();
            }, 0);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, profile?.plan_words_used, refreshProfile]);

  return realTimeWordsUsed;
};
