import { supabase } from '@/integrations/supabase/client';

export class PlanExpiryService {
  // Check and handle expired plans for a specific user
  static async checkUserPlanExpiry(userId: string): Promise<{
    wasExpired: boolean;
    downgradedToFree: boolean;
    preservedWords: number;
  }> {
    try {
      // Function doesn't exist in database, return default values
      console.warn('Plan expiry check function not available');
      return {
        wasExpired: false,
        downgradedToFree: false,
        preservedWords: 0
      };
    } catch (error) {
      console.error('Plan expiry check failed:', error);
      return { wasExpired: false, downgradedToFree: false, preservedWords: 0 };
    }
  }

  // Check all expired plans (admin function)
  static async handleAllExpiredPlans(): Promise<void> {
    try {
      // Function not available
      console.warn('Handle expired plans function not available');
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