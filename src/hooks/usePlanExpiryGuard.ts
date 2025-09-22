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
  const [hasChecked, setHasChecked] = useState(false);
  const [popupDismissed, setPopupDismissed] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState<number>(0);

  const checkPlanExpiry = async () => {
    // Prevent multiple checks within 5 minutes
    const now = Date.now();
    if (!user || !profile || popupDismissed || (now - lastCheckTime < 5 * 60 * 1000)) return;
    
    setIsLoading(true);
    setLastCheckTime(now);
    
    try {
      const { data, error } = await supabase.rpc('check_plan_expiry', {
        user_id_param: user.id
      });

      if (error) {
        console.warn('Plan expiry check failed:', error);
        return;
      }

      const response = data as unknown as PlanExpiryData;
      const expiryResult = response || { show_popup: false };
      
      // Check if plan is actually expiring/expired
      const shouldShow = expiryResult.show_popup && 
                        !popupDismissed && 
                        profile.plan !== 'free' && 
                        profile.plan_expires_at;
      
      if (shouldShow) {
        // Additional validation - check if plan is actually expiring soon
        const expiryDate = new Date(profile.plan_expires_at);
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        
        // Only show if expiring within 7 days or already expired
        if (daysUntilExpiry <= 7) {
          setExpiryData({
            ...expiryResult,
            days_until_expiry: Math.max(0, daysUntilExpiry),
            is_expired: daysUntilExpiry <= 0
          });
        }
      } else {
        setExpiryData(expiryResult);
      }
      
      setHasChecked(true);
    } catch (error) {
      console.warn('Plan expiry check failed:', error);
      setHasChecked(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user && profile && !popupDismissed) {
      if (profile.plan !== 'free' && profile.plan_expires_at) {
        // Check immediately and then every 30 minutes
        checkPlanExpiry();
        const interval = setInterval(checkPlanExpiry, 30 * 60 * 1000);
        return () => clearInterval(interval);
      }
    }
  }, [user?.id, profile?.plan, profile?.plan_expires_at, popupDismissed]);

  const dismissPopup = () => {
    setExpiryData({ show_popup: false });
    setPopupDismissed(true);
    
    // Store dismissal in session storage to prevent showing again this session
    try {
      sessionStorage.setItem(`plan_expiry_dismissed_${user?.id}`, 'true');
    } catch (error) {
      // Ignore storage errors
    }
  };

  // Check if popup was already dismissed this session
  useEffect(() => {
    if (user?.id) {
      try {
        const dismissed = sessionStorage.getItem(`plan_expiry_dismissed_${user.id}`);
        if (dismissed === 'true') {
          setPopupDismissed(true);
        }
      } catch (error) {
        // Ignore storage errors
      }
    }
  }, [user?.id]);

  return {
    expiryData,
    isLoading,
    dismissPopup,
    checkPlanExpiry
  };
};