import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export const useRealTimeWordCount = () => {
  const { user, profile, refreshProfile } = useAuth();
  const [realTimeWordsUsed, setRealTimeWordsUsed] = useState<number | null>(null);
  const [realTimePurchasedWords, setRealTimePurchasedWords] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const channelRef = useRef<any>(null);

  // Throttled refresh to prevent excessive API calls
  const throttledRefresh = useRef(
    (() => {
      let timeout: NodeJS.Timeout | null = null;
      return () => {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => {
          refreshProfile();
        }, 1000);
      };
    })()
  ).current;

  useEffect(() => {
    if (!user || user.id === 'guest') {
      setIsLoading(false);
      return;
    }

    // Set initial values
    setRealTimeWordsUsed(profile?.plan_words_used || 0);
    setRealTimePurchasedWords(profile?.word_balance || 0);
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
          if (payload.new) {
            const newWordsUsed = payload.new.plan_words_used;
            const newPurchasedWords = payload.new.word_balance;

            if (typeof newWordsUsed === 'number') {
              setRealTimeWordsUsed(newWordsUsed);
            }
            
            if (typeof newPurchasedWords === 'number') {
              setRealTimePurchasedWords(newPurchasedWords);
            }

            // Throttled refresh to update context
            throttledRefresh();
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
    };
  }, [user?.id]);

  // Sync with profile changes
  useEffect(() => {
    if (profile) {
      setRealTimeWordsUsed(profile.plan_words_used || 0);
      setRealTimePurchasedWords(profile.word_balance || 0);
    }
  }, [profile?.plan_words_used, profile?.word_balance]);

  return {
    realTimeWordsUsed,
    realTimePurchasedWords,
    isLoading,
  };
};