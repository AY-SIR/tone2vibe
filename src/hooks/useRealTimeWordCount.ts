import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export const useRealTimeWordCount = () => {
  const { user, profile, refreshProfile } = useAuth();
  const [realTimeWordsUsed, setRealTimeWordsUsed] = useState(0);
  const [realTimePurchasedWords, setRealTimePurchasedWords] = useState(0);

  useEffect(() => {
    if (!user || !profile) return;

    // Set initial value - show plan words used (not total)
    setRealTimeWordsUsed(profile.plan_words_used || 0);
    setRealTimePurchasedWords(profile.word_balance || 0);

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
          if (payload.new) {
            // Update both plan words and purchased words
            if (typeof payload.new.plan_words_used === 'number') {
              setRealTimeWordsUsed(payload.new.plan_words_used);
            }
            if (typeof payload.new.word_balance === 'number') {
              setRealTimePurchasedWords(payload.new.word_balance);
            }
            
            // Refresh profile to keep context in sync
            setTimeout(() => {
              refreshProfile();
            }, 100);
          }
        }
      )
      .subscribe();

    // Also subscribe to word_purchases table for immediate updates
    const wordPurchaseChannel = supabase
      .channel('word-purchase-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'word_purchases',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Word purchase detected, refreshing profile');
          setTimeout(() => {
            refreshProfile();
          }, 500);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(wordPurchaseChannel);
    };
  }, [user?.id, profile?.plan_words_used, profile?.word_balance, refreshProfile]);

  return { realTimeWordsUsed, realTimePurchasedWords };
};

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
