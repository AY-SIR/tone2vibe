import { supabase } from '@/integrations/supabase/client';

export class PlanExpiryService {
  // Check and handle expired plans for a specific user
  static async checkUserPlanExpiry(userId: string): Promise<{
    wasExpired: boolean;
    downgradedToFree: boolean;
    preservedWords: number;
  }> {
    try {
      const { data, error } = await supabase.rpc('downgrade_user_plan', {
        user_id_param: userId
      });

      if (error) {
        console.error('Error checking plan expiry:', error);
        return { wasExpired: false, downgradedToFree: false, preservedWords: 0 };
      }

      if (data?.success) {
        return {
          wasExpired: true,
          downgradedToFree: true,
          preservedWords: data.preserved_words || 0
        };
      }

      return { wasExpired: false, downgradedToFree: false, preservedWords: 0 };
    } catch (error) {
      console.error('Plan expiry check failed:', error);
      return { wasExpired: false, downgradedToFree: false, preservedWords: 0 };
    }
  }

  // Check all expired plans (admin function)
  static async handleAllExpiredPlans(): Promise<void> {
    try {
      const { error } = await supabase.rpc('handle_plan_expiry');
      
      if (error) {
        console.error('Error handling expired plans:', error);
      } else {
        console.log('Expired plans handled successfully');
      }
    } catch (error) {
      console.error('Failed to handle expired plans:', error);
    }
  }

  // Get plan expiry information
  static getPlanExpiryInfo(planExpiresAt: string | null): {
    isExpired: boolean;
    daysUntilExpiry: number;
    expiryDate: Date | null;
  } {
    if (!planExpiresAt) {
      return { isExpired: false, daysUntilExpiry: Infinity, expiryDate: null };
    }

    const expiryDate = new Date(planExpiresAt);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    return {
      isExpired: daysUntilExpiry <= 0,
      daysUntilExpiry: Math.max(0, daysUntilExpiry),
      expiryDate
    };
  }
}