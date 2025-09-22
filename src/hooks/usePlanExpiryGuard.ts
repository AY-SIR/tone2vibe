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

  const checkPlanExpiry = async () => {
    if (!user || !profile || hasChecked || popupDismissed) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('check_plan_expiry', {
        user_id_param: user.id
      });

      if (error) {
        console.warn('Plan expiry check failed');
        return;
      }

      const response = data as unknown as PlanExpiryData;
      const expiryResult = response || { show_popup: false };
      
      // Only show popup if it should be shown and hasn't been dismissed
      if (expiryResult.show_popup && !popupDismissed) {
        setExpiryData(expiryResult);
      }
      
      setHasChecked(true);
    } catch (error) {
      console.warn('Plan expiry check failed');
      setHasChecked(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user && profile && !hasChecked && !popupDismissed) {
      if (profile.plan !== 'free' && profile.plan_expires_at) {
        checkPlanExpiry();
      }
    }
  }, [user?.id, profile?.plan, profile?.plan_expires_at, hasChecked, popupDismissed]);

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