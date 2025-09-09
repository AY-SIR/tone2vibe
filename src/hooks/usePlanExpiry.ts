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

  const checkPlanExpiry = async () => {
    if (!user || !profile) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('check_plan_expiry', {
        user_id_param: user.id
      });

      if (error) {
        console.error('Error checking plan expiry:', error);
        return;
      }

      const response = data as unknown as PlanExpiryData;
      setExpiryData(response || { show_popup: false });
    } catch (error) {
      console.error('Error in plan expiry check:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Check on component mount and when user/profile changes
  useEffect(() => {
    if (user && profile) {
      // Only check for paid plans
      if (profile.plan !== 'free' && profile.plan_expires_at) {
        checkPlanExpiry();
      }
    }
  }, [user?.id, profile?.plan, profile?.plan_expires_at]);

  const dismissPopup = () => {
    setExpiryData({ show_popup: false });
  };

  return {
    expiryData,
    isLoading,
    dismissPopup,
    checkPlanExpiry
  };
};