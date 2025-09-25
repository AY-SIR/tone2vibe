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
    // Check if popup was dismissed in this session
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
    const now = Date.now();
    if (!user || !profile || popupDismissed || (now - lastCheckTime < 30 * 60 * 1000)) return;
    
    // Only check for paid plans with expiry dates
    if (profile.plan === 'free' || !profile.plan_expires_at) return;
    
    // Check if popup was already dismissed this session
    try {
      const dismissed = sessionStorage.getItem(`plan_expiry_dismissed_${user.id}`);
      if (dismissed === 'true') {
        setPopupDismissed(true);
        return;
      }
    } catch {
      // Ignore storage errors
    }
    
    setIsLoading(true);
    setLastCheckTime(now);
    
    try {
      const expiryDate = new Date(profile.plan_expires_at);
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      
      // Only show popup if expiring within 7 days or already expired, and not dismissed
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

  // Single effect to handle plan expiry checking
  useEffect(() => {
    if (user?.id && profile && !popupDismissed) {
      // Only check once when user/profile changes, not on interval
      checkPlanExpiry();
    }
  }, [user?.id, profile?.plan, profile?.plan_expires_at]);

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