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
  const [popupDismissed, setPopupDismissed] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState<number>(0);

  const checkPlanExpiry = async () => {
    // Prevent multiple checks within 10 minutes and if popup was dismissed
    const now = Date.now();
    if (!user || !profile || popupDismissed || (now - lastCheckTime < 10 * 60 * 1000)) return;
    
    // Only check for paid plans with expiry dates
    if (profile.plan === 'free' || !profile.plan_expires_at) return;
    
    setIsLoading(true);
    setLastCheckTime(now);
    
    try {
      const expiryDate = new Date(profile.plan_expires_at);
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      
      // Only show popup if expiring within 7 days or already expired
      const shouldShow = daysUntilExpiry <= 7;
      
      if (shouldShow && !popupDismissed) {
        setExpiryData({
          show_popup: true,
          days_until_expiry: Math.max(0, daysUntilExpiry),
          plan: profile.plan,
          expires_at: profile.plan_expires_at,
          is_expired: daysUntilExpiry <= 0
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
    if (user?.id) {
      // Check if popup was already dismissed this session
      try {
        const dismissed = sessionStorage.getItem(`plan_expiry_dismissed_${user.id}`);
        if (dismissed === 'true') {
          setPopupDismissed(true);
          return;
        }
      } catch (error) {
        // Ignore storage errors
      }
    }

    if (user && profile && !popupDismissed) {
      // Check immediately and then every hour
      checkPlanExpiry();
      const interval = setInterval(checkPlanExpiry, 60 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [user?.id, profile?.plan, profile?.plan_expires_at, popupDismissed]);

  const dismissPopup = () => {
    setExpiryData({ show_popup: false });
    setPopupDismissed(true);
    
    // Store dismissal in session storage
    try {
      if (user?.id) {
        sessionStorage.setItem(`plan_expiry_dismissed_${user.id}`, 'true');
      }
    } catch (error) {
      // Ignore storage errors
    }
  };

  return {
    expiryData,
    isLoading,
    dismissPopup,
    checkPlanExpiry
  };
};