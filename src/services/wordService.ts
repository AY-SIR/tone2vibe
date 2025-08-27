
import { supabase } from '@/integrations/supabase/client';

export interface WordUsageStats {
  used: number;
  limit: number;
  remaining: number;
  percentage: number;
  purchasedWords?: number;
  planWordsRemaining?: number;
  totalAvailable?: number;
}

export interface PricingForUser {
  canPurchase: boolean;
  pricePerThousand: number;
  currency: string;
  symbol: string;
  maxPurchase: number;
}

export class WordService {
  static async getCurrentWordStats(userId: string): Promise<WordUsageStats> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('plan_words_used, words_limit, word_balance, plan')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        throw new Error('User profile not found');
      }

      const planWordsUsed = data.plan_words_used || 0;
      const planLimit = data.words_limit || 1000;
      const plan = data.plan || 'free';
      
      // Only show purchased words for Pro/Premium users (always show, even if 0)
      // Free users should never see purchased words
      let purchasedWords = 0;
      if (plan !== 'free') {
        purchasedWords = data.word_balance || 0;
      }
      
      // Plan words remaining (these expire monthly)
      const planWordsRemaining = Math.max(0, planLimit - planWordsUsed);
      
      // Total available = plan words + purchased words (purchased never expire)
      const totalAvailable = planWordsRemaining + purchasedWords;
      
      // For percentage, show only plan words usage (not purchased)
      const percentage = planLimit > 0 ? (planWordsUsed / planLimit) * 100 : 0;

      return {
        used: planWordsUsed, // Only plan words used
        limit: planLimit, // Only plan limit
        remaining: totalAvailable, // Total available (plan + purchased)
        percentage: Math.min(percentage, 100),
        purchasedWords, // Show purchased separately
        planWordsRemaining, // Plan words left
        totalAvailable // Total words available
      };
    } catch (error) {
      console.error('Error fetching word stats:', error);
      return {
        used: 0,
        limit: 1000,
        remaining: 1000,
        percentage: 0,
        purchasedWords: 0,
        planWordsRemaining: 1000,
        totalAvailable: 1000
      };
    }
  }

  static async updateWordCount(userId: string, wordsUsed: number): Promise<boolean> {
    try {
      // Use smart deduction: plan words first, then purchased words
      const { data, error } = await supabase.rpc('deduct_words_smartly', {
        user_id_param: userId,
        words_to_deduct: wordsUsed
      });

      if (error) {
        console.error('Error deducting words:', error);
        return false;
      }

      // Cast the response to our expected type
      const result = data as { success: boolean; error?: string; [key: string]: any } | null;
      
      if (!result || !result.success) {
        console.error('Smart word deduction failed:', result?.error || 'Unknown error');
        return false;
      }

      console.log('Words deducted successfully:', result);
      return true;
    } catch (error) {
      console.error('Error updating word count:', error);
      return false;
    }
  }

  static async canPurchaseWords(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('plan, words_limit')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        throw new Error('User profile not found');
      }
      return data.plan !== 'free';
    } catch (error) {
      console.error('Error checking word purchase eligibility:', error);
      return false;
    }
  }

  static getPricingForUser(plan: string = 'free', currency: string = 'USD'): PricingForUser {
    const pricingMap = {
      'INR': { pricePerThousand: 31, symbol: '₹' },
      'USD': { pricePerThousand: 0.49, symbol: '$' }

    };

    const pricing = pricingMap[currency as keyof typeof pricingMap] || pricingMap['USD'];
    
    return {
      canPurchase: plan !== 'free',
      pricePerThousand: pricing.pricePerThousand,
      currency,
      symbol: pricing.symbol,
      maxPurchase: plan === 'premium' ? 49000 : plan === 'pro' ? 36000 : 0
    };
  }

  static getMaxWordsForPlan(plan: string): number {
    switch (plan) {
      case 'free': return 1000;   // Free: 1k words only
      case 'pro': return 10000;   // Pro: 10k included words
      case 'premium': return 50000; // Premium: 50k included words
      default: return 1000;
    }
  }

  static getMaxPurchaseLimit(plan: string): number {
    switch (plan) {
      case 'pro': return 36000; // Pro users can buy up to 36k additional words
      case 'premium': return 49000; // Premium users can buy up to 49k additional words
      default: return 0;
    }
  }

  static async getPurchaseableWords(userId: string): Promise<{
    canPurchase: boolean;
    maxLimit: number;
    currentPurchased: number;
    availableToPurchase: number;
  }> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('plan, word_balance')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        throw new Error('User profile not found');
      }

      const plan = data.plan || 'free';
      const currentPurchased = data.word_balance || 0; // Currently purchased words
      const maxLimit = this.getMaxPurchaseLimit(plan); // Max can purchase
      const canPurchase = plan !== 'free';
      const availableToPurchase = Math.max(0, maxLimit - currentPurchased);

      return {
        canPurchase,
        maxLimit, // Total max purchase limit (36k for pro, 49k for premium)
        currentPurchased, // Currently purchased words
        availableToPurchase // How many more can be purchased
      };
    } catch (error) {
      console.error('Error getting purchaseable words:', error);
      return {
        canPurchase: false,
        maxLimit: 0,
        currentPurchased: 0,
        availableToPurchase: 0
      };
    }
  }

  static async addPurchasedWords(userId: string, wordsPurchased: number, paymentId: string): Promise<boolean> {
    try {
      // Use the database function to properly add purchased words
      const { data, error } = await supabase.rpc('add_purchased_words', {
        user_id_param: userId,
        words_to_add: wordsPurchased,
        payment_id_param: paymentId
      });

      if (error) {
        console.error('Error adding purchased words:', error);
        return false;
      }

      return data === true;
    } catch (error) {
      console.error('Error adding purchased words:', error);
      return false;
    }
  }

  static calculateWordPrice(words: number): number {
    return words * 0.01;
  }

  static formatMaxLimit(limit: number): string {
    if (limit >= 1000) {
      return `${(limit / 1000).toFixed(limit % 1000 === 0 ? 0 : 1)}k`;
    }
    return limit.toString();
  }
}
