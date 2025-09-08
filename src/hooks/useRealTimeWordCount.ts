import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export const useRealTimeWordCount = () => {
  const { user, profile, refreshProfile } = useAuth();
  const [realTimeWordsUsed, setRealTimeWordsUsed] = useState(0);

  useEffect(() => {
    if (!user || !profile) return;

    console.log('Setting up real-time word count for user:', user.id, 'Plan words used:', profile.plan_words_used);
    
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
          console.log('Real-time word count update:', payload);
          if (payload.new && typeof payload.new.plan_words_used === 'number') {
            console.log('Updating real-time plan words used to:', payload.new.plan_words_used);
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
      console.log('Cleaning up real-time word count subscription');
      supabase.removeChannel(channel);
    };
  }, [user?.id, profile?.plan_words_used, refreshProfile]);

  return realTimeWordsUsed;
};
