import { supabase } from '@/integrations/supabase/client';

export interface PrebuiltVoice {
  id: string;
  voice_id: string;
  name: string;
  description: string;
  category: string;
  gender?: string;
  accent?: string;
  language: string;
  required_plan: 'free' | 'pro' | 'premium';
  audio_preview_url?: string;
  is_active: boolean;
  sort_order: number;
  usage_count?: number; // Track usage for sorting
  created_at: string;
  updated_at: string;
}

export class PrebuiltVoiceService {
  /**
   * Get voices available for user's plan with progressive loading
   * This fetches from database, ensuring data security
   */
  static async getVoicesForPlan(
    userPlan: string,
    limit?: number,
    offset?: number
  ): Promise<PrebuiltVoice[]> {
    try {
      // Determine allowed plans based on user's current plan
      let allowedPlans: string[] = ['free'];

      if (userPlan === 'pro') {
        allowedPlans = ['free', 'pro'];
      } else if (userPlan === 'premium') {
        allowedPlans = ['free', 'pro', 'premium'];
      }

      // Build query with filters
      let query = supabase
        .from('prebuilt_voices')
        .select('*')
        .eq('is_active', true)
        .in('required_plan', allowedPlans)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });

      // Add pagination for progressive loading (optional)
      if (limit) {
        query = query.range(offset || 0, (offset || 0) + limit - 1);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching prebuilt voices:', error);
        throw new Error(`Failed to fetch voices: ${error.message}`);
      }

      return (data || []) as PrebuiltVoice[];
    } catch (error) {
      console.error('Error in getVoicesForPlan:', error);
      return [];
    }
  }

  /**
   * Get all active voices (for admin purposes or browsing)
   */
  static async getAllActiveVoices(): Promise<PrebuiltVoice[]> {
    try {
      const { data, error } = await supabase
        .from('prebuilt_voices')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching all prebuilt voices:', error);
        throw new Error(`Failed to fetch all voices: ${error.message}`);
      }

      return (data || []) as PrebuiltVoice[];
    } catch (error) {
      console.error('Error in getAllActiveVoices:', error);
      return [];
    }
  }

  /**
   * Get voices by category for a specific user plan
   */
  static async getVoicesByCategory(
    category: string,
    userPlan: string
  ): Promise<PrebuiltVoice[]> {
    try {
      const voices = await this.getVoicesForPlan(userPlan);
      return voices.filter(voice => voice.category === category);
    } catch (error) {
      console.error('Error fetching voices by category:', error);
      return [];
    }
  }

  /**
   * Get voices by language
   */
  static async getVoicesByLanguage(
    language: string,
    userPlan: string
  ): Promise<PrebuiltVoice[]> {
    try {
      const voices = await this.getVoicesForPlan(userPlan);
      return voices.filter(voice => voice.language === language);
    } catch (error) {
      console.error('Error fetching voices by language:', error);
      return [];
    }
  }

  /**
   * Get a single voice by voice_id
   */
  static async getVoiceById(voiceId: string): Promise<PrebuiltVoice | null> {
    try {
      const { data, error } = await supabase
        .from('prebuilt_voices')
        .select('*')
        .eq('voice_id', voiceId)
        .eq('is_active', true)
  .maybeSingle(); // ← safe

      if (error) {
        console.error('Error fetching voice by ID:', error);
        return null;
      }

      return data as PrebuiltVoice;
    } catch (error) {
      console.error('Error in getVoiceById:', error);
      return null;
    }
  }

  /**
   * Check if user can access a specific voice based on their plan
   */
  static canAccessVoice(voice: PrebuiltVoice, userPlan: string): boolean {
    if (voice.required_plan === 'free') {
      return true;
    }

    if (voice.required_plan === 'pro') {
      return ['pro', 'premium'].includes(userPlan);
    }

    if (voice.required_plan === 'premium') {
      return userPlan === 'premium';
    }

    return false;
  }

  /**
   * Get plan access information for UI display
   */
  static getVoiceAccessInfo(userPlan: string) {
    return {
      free: {
        description: 'Basic voices for everyday use',
        available: true,
        voiceCount: 'Limited selection'
      },
      pro: {
        description: 'Professional AI voices for content creation',
        available: ['pro', 'premium'].includes(userPlan),
        voiceCount: 'Extended library'
      },
      premium: {
        description: 'Premium AI voices with celebrity and character styles',
        available: userPlan === 'premium',
        voiceCount: 'Full library access'
      }
    };
  }

  /**
   * Get available categories from voices
   */
  static async getAvailableCategories(userPlan: string): Promise<string[]> {
    try {
      const voices = await this.getVoicesForPlan(userPlan);
      const categories = Array.from(
        new Set(voices.map(v => v.category).filter(Boolean))
      );
      return categories.sort();
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  }

  /**
   * Get available genders from voices
   */
  static async getAvailableGenders(userPlan: string): Promise<string[]> {
    try {
      const voices = await this.getVoicesForPlan(userPlan);
      const genders = Array.from(
        new Set(voices.map(v => v.gender).filter(Boolean))
      );
      return genders.sort();
    } catch (error) {
      console.error('Error fetching genders:', error);
      return [];
    }
  }

  /**
   * Get available languages from voices
   */
  static async getAvailableLanguages(userPlan: string): Promise<string[]> {
    try {
      const voices = await this.getVoicesForPlan(userPlan);
      const languages = Array.from(
        new Set(voices.map(v => v.language).filter(Boolean))
      );
      return languages.sort();
    } catch (error) {
      console.error('Error fetching languages:', error);
      return [];
    }
  }

  /**
   * Search voices with filters
   */
  static async searchVoices(
    searchTerm: string,
    filters: {
      category?: string;
      gender?: string;
      language?: string;
      plan?: string;
    },
    userPlan: string
  ): Promise<PrebuiltVoice[]> {
    try {
      let voices = await this.getVoicesForPlan(userPlan);

      // Apply language filter
      if (filters.language) {
        voices = voices.filter(v => v.language === filters.language);
      }

      // Apply category filter
      if (filters.category) {
        voices = voices.filter(v => v.category === filters.category);
      }

      // Apply gender filter
      if (filters.gender) {
        voices = voices.filter(v => v.gender === filters.gender);
      }

      // Apply plan filter
      if (filters.plan) {
        voices = voices.filter(v => v.required_plan === filters.plan);
      }

      // Apply search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        voices = voices.filter(v =>
          v.name.toLowerCase().includes(term) ||
          v.description.toLowerCase().includes(term) ||
          (v.category?.toLowerCase().includes(term)) ||
          (v.gender?.toLowerCase().includes(term)) ||
          (v.accent?.toLowerCase().includes(term))
        );
      }

      return voices;
    } catch (error) {
      console.error('Error searching voices:', error);
      return [];
    }
  }

  /**
   * Validate if user can use a voice for generation
   */
  static async validateVoiceAccess(
    voiceId: string,
    userPlan: string
  ): Promise<{ canAccess: boolean; message?: string; voice?: PrebuiltVoice }> {
    try {
      const voice = await this.getVoiceById(voiceId);

      if (!voice) {
        return {
          canAccess: false,
          message: 'Voice not found or is inactive'
        };
      }

      const canAccess = this.canAccessVoice(voice, userPlan);

      if (!canAccess) {
        return {
          canAccess: false,
          message: `This voice requires ${voice.required_plan} plan. Please upgrade to use it.`,
          voice
        };
      }

      return {
        canAccess: true,
        voice
      };
    } catch (error) {
      console.error('Error validating voice access:', error);
      return {
        canAccess: false,
        message: 'Error validating voice access'
      };
    }
  }

  /**
   * Track voice usage for analytics and sorting
   */
  static async trackVoiceUsage(voiceId: string): Promise<void> {
    try {
      // Increment usage count in localStorage for client-side tracking
      const usageKey = `voice_usage_${voiceId}`;
      const currentUsage = parseInt(localStorage.getItem(usageKey) || '0', 10);
      localStorage.setItem(usageKey, (currentUsage + 1).toString());
    } catch (error) {
      console.error('Error tracking voice usage:', error);
    }
  }

  /**
   * Get voice usage count from localStorage
   */
  static getVoiceUsageCount(voiceId: string): number {
    try {
      const usageKey = `voice_usage_${voiceId}`;
      return parseInt(localStorage.getItem(usageKey) || '0', 10);
    } catch (error) {
      console.error('Error getting voice usage count:', error);
      return 0;
    }
  }

  /**
   * Get voice statistics for user's plan
   */
  static async getVoiceStats(userPlan: string): Promise<{
    total: number;
    byPlan: { free: number; pro: number; premium: number };
    byCategory: Record<string, number>;
    byLanguage: Record<string, number>;
  }> {
    try {
      const voices = await this.getVoicesForPlan(userPlan);

      const stats = {
        total: voices.length,
        byPlan: {
          free: voices.filter(v => v.required_plan === 'free').length,
          pro: voices.filter(v => v.required_plan === 'pro').length,
          premium: voices.filter(v => v.required_plan === 'premium').length
        },
        byCategory: {} as Record<string, number>,
        byLanguage: {} as Record<string, number>
      };

      // Count by category
      voices.forEach(v => {
        if (v.category) {
          stats.byCategory[v.category] = (stats.byCategory[v.category] || 0) + 1;
        }
      });

      // Count by language
      voices.forEach(v => {
        if (v.language) {
          stats.byLanguage[v.language] = (stats.byLanguage[v.language] || 0) + 1;
        }
      });

      return stats;
    } catch (error) {
      console.error('Error getting voice stats:', error);
      return {
        total: 0,
        byPlan: { free: 0, pro: 0, premium: 0 },
        byCategory: {},
        byLanguage: {}
      };
    }
  }
}

// Export helper function to get plan badge color
export function getPlanBadgeVariant(plan: string, userPlan: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (plan === 'free') return 'secondary';

  if (plan === 'pro') {
    return ['pro', 'premium'].includes(userPlan) ? 'default' : 'outline';
  }

  if (plan === 'premium') {
    return userPlan === 'premium' ? 'default' : 'outline';
  }

  return 'outline';
}

// Export helper to format plan name
export function formatPlanName(plan: string): string {
  return plan.charAt(0).toUpperCase() + plan.slice(1);
}