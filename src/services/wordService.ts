import { supabase } from '@/integrations/supabase/client';

export interface WordPricing {
  pricePerThousand: number;
  symbol: string;
  currency: string;
}

export class WordService {
  // Plan-based pricing for India only service
  static getPricingForUser(plan: string): WordPricing {
    let pricePerThousand = 31; // Default price
    
    if (plan === 'pro') {
      pricePerThousand = 11; // ₹11 per 1000 words for Pro
    } else if (plan === 'premium') {
      pricePerThousand = 9; // ₹9 per 1000 words for Premium
    }
    
    return {
      pricePerThousand,
      symbol: '₹',
      currency: 'INR'
    };
  }

  // Get user's available word balance
  static async getUserWordBalance(userId: string): Promise<{
    planWords: number;
    planWordsUsed: number;
    purchasedWords: number;
    totalAvailable: number;
  }> {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('plan, words_limit, plan_words_used, word_balance')
        .eq('user_id', userId)
        .single();

      if (!profile) {
        return {
          planWords: 0,
          planWordsUsed: 0,
          purchasedWords: 0,
          totalAvailable: 0
        };
      }

      const planWords = profile.words_limit || 0;
      const planWordsUsed = profile.plan_words_used || 0;
      const purchasedWords = profile.word_balance || 0;
      const planWordsRemaining = Math.max(0, planWords - planWordsUsed);
      const totalAvailable = planWordsRemaining + purchasedWords;

      return {
        planWords,
        planWordsUsed,
        purchasedWords,
        totalAvailable
      };
    } catch (error) {
      console.error('Error fetching word balance:', error);
      return {
        planWords: 0,
        planWordsUsed: 0,
        purchasedWords: 0,
        totalAvailable: 0
      };
    }
  }

  // Check if user can purchase more words
  static canPurchaseWords(plan: string): boolean {
    return plan === 'pro' || plan === 'premium';
  }

  // Get maximum purchase limit based on plan
  static getMaxPurchaseLimit(plan: string, currentPurchased: number): number {
    if (!this.canPurchaseWords(plan)) return 0;
    
    const maxPurchaseLimit = plan === 'pro' ? 36000 : 49000;
    return Math.max(0, maxPurchaseLimit - currentPurchased);
  }

  // Calculate word usage for generation
  static async useWords(userId: string, wordsUsed: number): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('deduct_words_smartly', {
        user_id_param: userId,
        words_to_deduct: wordsUsed
      });

      if (error) {
        console.error('Error using words:', error);
        return false;
      }

      return data === true;
    } catch (error) {
      console.error('Error using words:', error);
      return false;
    }
  }
}