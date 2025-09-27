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
    // Prevent multiple checks within 30 minutes and if popup was dismissed
    if (!user || !profile || popupDismissed || (Date.now() - lastCheckTime < 30 * 60 * 1000)) return;

    setIsLoading(true);
    setLastCheckTime(Date.now());

    try {
      // If free plan, nothing to check
      if (profile.plan === 'free' || !profile.plan_expires_at) {
        setExpiryData({ show_popup: false });
        return;
      }

      const expiryDate = new Date(profile.plan_expires_at);
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

      // If plan expired, downgrade to free
      if (daysUntilExpiry <= 0) {
        console.log('Plan expired, downgrading to free tier...');
        
        // Update backend to downgrade to free tier
        const { error } = await supabase
          .from('profiles')
          .update({ 
            plan: 'free',
            words_limit: 1000,
            upload_limit_mb: 10,
            plan_expires_at: null,
            plan_start_date: null,
            plan_end_date: null,
            plan_words_used: 0, // Reset plan words for new free tier
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);

        if (error) {
          console.error('Error downgrading plan to free:', error);
        } else {
          console.log('Plan successfully downgraded to free tier');
        }

        // Show expired popup once per session
        const expiredShownKey = `expired_shown_${user.id}_${profile.plan_expires_at}`;
        const expiredShown = sessionStorage.getItem(expiredShownKey) === 'true';
        
        if (!expiredShown) {
          setExpiryData({
            show_popup: true,
            days_until_expiry: 0,
            plan: profile.plan, // Show original plan name
            expires_at: profile.plan_expires_at,
            is_expired: true
          });
          
          // Mark as shown for this specific expiry date
          try {
            sessionStorage.setItem(expiredShownKey, 'true');
          } catch {
            // Ignore storage errors
          }
        } else {
          setExpiryData({ show_popup: false });
        }
        return;
      }

      // Show popup if expiring within 7 days
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

  useEffect(() => {
    if (user?.id && profile) {
      checkPlanExpiry();
    }
  }, [user?.id, profile?.plan, profile?.plan_expires_at]);

  const dismissPopup = () => {
    setExpiryData({ show_popup: false });
    setPopupDismissed(true);

    try {
      if (user?.id) {
        sessionStorage.setItem(`plan_expiry_dismissed_${user.id}`, 'true');
      }
    } catch {
      // ignore
    }
  };

  return {
    expiryData,
    isLoading,
    dismissPopup,
    checkPlanExpiry
  };
};