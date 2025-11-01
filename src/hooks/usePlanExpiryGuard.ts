import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

interface PlanExpiryData {
  show_popup: boolean;
  days_until_expiry?: number;
  plan?: string;
  expires_at?: string;
  is_expired?: boolean;
}

interface Profile {
  plan: string;
  plan_expires_at: string | null;
}

export const usePlanExpiry = (user: User | null, profile: Profile | null) => {
  const [expiryData, setExpiryData] = useState<PlanExpiryData>({ show_popup: false });
  const [isLoading, setIsLoading] = useState(false);
  const [popupDismissed, setPopupDismissed] = useState(() => {
    if (user?.id) {
      try {
        return sessionStorage.getItem(`plan_expiry_dismissed_${user.id}`) === 'true';
      } catch {
        return false;
      }
    }
    return false;
  });
  const [lastCheckTime, setLastCheckTime] = useState<number>(0);

  const checkPlanExpiry = async () => {
    if (!user || !profile || popupDismissed) return;

    const now = Date.now();
    // Throttle only for subsequent checks
    if (lastCheckTime && now - lastCheckTime < 30 * 60 * 1000) return;
    setLastCheckTime(now);

    setIsLoading(true);

    try {
      // Free plan: nothing to do
      if (profile.plan === 'free' || !profile.plan_expires_at) {
        setExpiryData({ show_popup: false });
        return;
      }

      const expiryDate = new Date(profile.plan_expires_at);
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now) / (1000 * 60 * 60 * 24));

      // Expired plan: downgrade instantly
      if (daysUntilExpiry <= 0) {
        console.log('Plan expired, downgrading to free tier...');
        const { error } = await supabase
          .from('profiles')
          .update({
            plan: 'free',
            words_limit: 1000,
            upload_limit_mb: 10,
            plan_expires_at: null,
            plan_start_date: null,
            plan_end_date: null,
            plan_words_used: 0,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);

        if (error) {
          console.error('Error downgrading plan to free:', error);
        } else {
          console.log('Plan successfully downgraded to free tier');
        }

        // Show expired popup once per specific expiry date
        const expiredShownKey = `expired_shown_${user.id}_${profile.plan_expires_at}`;
        const expiredShown = sessionStorage.getItem(expiredShownKey) === 'true';

        if (!expiredShown) {
          setExpiryData({
            show_popup: true,
            days_until_expiry: 0,
            plan: profile.plan,
            expires_at: profile.plan_expires_at,
            is_expired: true
          });
          try {
            sessionStorage.setItem(expiredShownKey, 'true');
          } catch {}
        } else {
          setExpiryData({ show_popup: false });
        }

        // Trigger server-side purge of expired history/analytics with authentication
        const SUPABASE_URL = "https://msbmyiqhohtjdfbjmxlf.supabase.co";
        try {
          // Get the current session token
          const { data: { session } } = await supabase.auth.getSession();

          if (session?.access_token) {
            // Call purge-expired-history with auth header
            await fetch(`${SUPABASE_URL}/functions/v1/purge-expired-history`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json'
              }
            });

            // Call purge-user-analytics with auth header and user_id
            await fetch(`${SUPABASE_URL}/functions/v1/purge-user-analytics`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ user_id: user.id })
            });

            console.log('Cleanup functions triggered successfully');
          } else {
            console.warn('No active session found, skipping cleanup functions');
          }
        } catch (error) {
          console.warn('Failed to trigger cleanup functions:', error);
        }

        return;
      }

      // Show popup if plan expiring within 7 days
      if (daysUntilExpiry <= 7 && !popupDismissed) {
        setExpiryData({
          show_popup: true,
          days_until_expiry: daysUntilExpiry,
          plan: profile.plan,
          expires_at: profile.plan_expires_at,
          is_expired: false
        });
      } else {
        setExpiryData({ show_popup: false });
      }
    } catch (error) {
      console.warn('Plan expiry check failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Run instantly whenever profile loads
  useEffect(() => {
    if (user && profile) {
      checkPlanExpiry();
    }
  }, [user, profile]);

  const dismissPopup = () => {
    setExpiryData({ show_popup: false });
    setPopupDismissed(true);
    try {
      if (user?.id) {
        sessionStorage.setItem(`plan_expiry_dismissed_${user.id}`, 'true');
      }
    } catch {}
  };

  return {
    expiryData,
    isLoading,
    dismissPopup,
    checkPlanExpiry
  };
};