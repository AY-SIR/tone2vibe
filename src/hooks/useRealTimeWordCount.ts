import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { throttle } from 'lodash'; // npm install lodash

export const useRealTimeWordCount = () => {
  const { user, profile, refreshProfile } = useAuth();
  const [realTimeWordsUsed, setRealTimeWordsUsed] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const channelRef = useRef(null);

  // Throttle profile refresh to once every 1 second
  const throttledRefresh = useRef(
    throttle(() => {
      console.log('Refreshing profile after word count change');
      refreshProfile();
    }, 1000)
  ).current;

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    console.log('Setting up real-time word count for user:', user.id);

    // Set initial value
    const initialWordsUsed = profile?.plan_words_used || 0;
    setRealTimeWordsUsed(initialWordsUsed);
    setIsLoading(false);

    // Subscribe to real-time changes
    const channel = supabase
      .channel(`word-count-changes-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Real-time word count update received:', payload);

          if (payload.new && typeof payload.new.plan_words_used === 'number') {
            const newWordsUsed = payload.new.plan_words_used;

            setRealTimeWordsUsed((prevWordsUsed) => {
              if (prevWordsUsed !== newWordsUsed) {
                console.log('Word count changed from', prevWordsUsed, 'to', newWordsUsed);
                throttledRefresh();
                return newWordsUsed;
              }
              return prevWordsUsed;
            });
          } else {
            console.warn('Invalid payload received in real-time update:', payload);
          }
        }
      )
      .on('subscribe', (status) => {
        console.log('Word count subscription status:', status);
      })
      .on('error', (error) => {
        console.error('Word count subscription error:', error);
      })
      .subscribe();

    channelRef.current = channel;

    // Cleanup function
    return () => {
      console.log('Cleaning up real-time word count subscription for user:', user.id);
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
    };
  }, [user?.id, refreshProfile]); // Only re-run when user ID changes

  // Sync with profile changes (fallback mechanism)
  useEffect(() => {
    if (profile?.plan_words_used !== undefined) {
      setRealTimeWordsUsed(profile.plan_words_used);
    }
  }, [profile?.plan_words_used]);

  // Helper functions
  const getTotalWordsAvailable = () =>
    Math.max(0, (profile?.words_limit || 0) - realTimeWordsUsed + (profile?.word_balance || 0));

  const getPlanWordsRemaining = () => Math.max(0, (profile?.words_limit || 0) - realTimeWordsUsed);

  const getPurchasedWordsBalance = () => profile?.word_balance || 0;

  return {
    realTimeWordsUsed,
    isLoading,
    getTotalWordsAvailable,
    getPlanWordsRemaining,
    getPurchasedWordsBalance,
  };
};
