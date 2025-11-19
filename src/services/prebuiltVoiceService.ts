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
  usage_count?: number;
  created_at: string;
  updated_at: string;
}

export class PrebuiltVoiceService {
  /** Simple in-memory cache to reduce redundant Supabase calls */
  private static cache: Record<string, { data: PrebuiltVoice[]; time: number }> = {};
  private static cacheTTL = 1000 * 60 * 2; // 2 minutes

  /** Helper: get allowed plans for a given user plan */
  private static getAllowedPlans(userPlan: string): string[] {
    if (userPlan === 'premium') return ['free', 'pro', 'premium'];
    if (userPlan === 'pro') return ['free', 'pro'];
    return ['free'];
  }

  /** ✅ Get all active voices (for browsing, no plan restriction) */
  static async getAllActiveVoices(): Promise<PrebuiltVoice[]> {
    try {
      const { data, error } = await supabase
        .from('prebuilt_voices')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true })
        .throwOnError();

      return (data || []) as PrebuiltVoice[];
    } catch (error) {
      console.error('Error in getAllActiveVoices:', error);
      return [];
    }
  }

  /** ✅ Get voices available for user's plan (with caching and proper sorting) */
  static async getVoicesForPlan(userPlan: string, limit?: number, offset?: number): Promise<PrebuiltVoice[]> {
    try {
      const allowedPlans = this.getAllowedPlans(userPlan);
      const cacheKey = `${userPlan}_${limit}_${offset}`;
      const now = Date.now();

      // Return cached if fresh
      if (this.cache[cacheKey] && now - this.cache[cacheKey].time < this.cacheTTL) {
        return this.cache[cacheKey].data;
      }

      // Fetch all voices with their plan requirements
      let query = supabase
        .from('prebuilt_voices')
        .select('*')
        .eq('is_active', true);

      const { data, error } = await query.throwOnError();
      
      if (!data) return [];

      // Sort voices by plan: free first, then pro, then premium
      const planOrder: Record<string, number> = { 'free': 1, 'pro': 2, 'premium': 3 };
      
      const sortedVoices = data
        .filter(voice => allowedPlans.includes(voice.required_plan))
        .sort((a, b) => {
          const orderA = planOrder[a.required_plan] || 999;
          const orderB = planOrder[b.required_plan] || 999;
          if (orderA !== orderB) return orderA - orderB;
          // Within same plan, sort by sort_order then name
          if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
          return a.name.localeCompare(b.name);
        });

      // Apply pagination if requested
      const result = limit 
        ? sortedVoices.slice(offset || 0, (offset || 0) + limit)
        : sortedVoices;

      this.cache[cacheKey] = { data: result as PrebuiltVoice[], time: now };
      return result as PrebuiltVoice[];
    } catch (error) {
      console.error('Error in getVoicesForPlan:', error);
      return [];
    }
  }

  /** ✅ Get voices by category (optimized query) */
  static async getVoicesByCategory(category: string, userPlan: string): Promise<PrebuiltVoice[]> {
    try {
      const allowedPlans = this.getAllowedPlans(userPlan);
      const { data, error } = await supabase
        .from('prebuilt_voices')
        .select('*')
        .eq('is_active', true)
        .eq('category', category)
        .in('required_plan', allowedPlans)
        .order('sort_order', { ascending: true })
        .throwOnError();

      return (data || []) as PrebuiltVoice[];
    } catch (error) {
      console.error('Error fetching voices by category:', error);
      return [];
    }
  }

  /** ✅ Get voices by language (optimized query) */
  static async getVoicesByLanguage(language: string, userPlan: string): Promise<PrebuiltVoice[]> {
    try {
      const allowedPlans = this.getAllowedPlans(userPlan);
      const { data, error } = await supabase
        .from('prebuilt_voices')
        .select('*')
        .eq('is_active', true)
        .ilike('language', language) // case-insensitive
        .in('required_plan', allowedPlans)
        .order('sort_order', { ascending: true })
        .throwOnError();

      return (data || []) as PrebuiltVoice[];
    } catch (error) {
      console.error('Error fetching voices by language:', error);
      return [];
    }
  }

  /** ✅ Get single voice by voice_id */
  static async getVoiceById(voiceId: string): Promise<PrebuiltVoice | null> {
    try {
      const { data, error } = await supabase
        .from('prebuilt_voices')
        .select('*')
        .eq('voice_id', voiceId)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle()
        .throwOnError();

      return data as PrebuiltVoice;
    } catch (error) {
      console.error('Error in getVoiceById:', error);
      return null;
    }
  }

  /** ✅ Check if user can access a voice */
  static canAccessVoice(voice: PrebuiltVoice, userPlan: string): boolean {
    if (voice.required_plan === 'free') return true;
    if (voice.required_plan === 'pro') return ['pro', 'premium'].includes(userPlan);
    if (voice.required_plan === 'premium') return userPlan === 'premium';
    return false;
  }

  /** ✅ Get plan descriptions for UI */
  static getVoiceAccessInfo(userPlan: string) {
    return {
      free: {
        description: 'Basic voices for everyday use',
        available: true,
        voiceCount: 'Limited selection',
      },
      pro: {
        description: 'Professional AI voices for creators',
        available: ['pro', 'premium'].includes(userPlan),
        voiceCount: 'Extended library',
      },
      premium: {
        description: 'Celebrity and character-grade premium voices',
        available: userPlan === 'premium',
        voiceCount: 'Full library access',
      },
    };
  }

  /** ✅ Get all unique categories */
  static async getAvailableCategories(userPlan: string): Promise<string[]> {
    try {
      const voices = await this.getVoicesForPlan(userPlan);
      return Array.from(new Set(voices.map(v => v.category).filter(Boolean))).sort();
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  }

  /** ✅ Get available genders */
  static async getAvailableGenders(userPlan: string): Promise<string[]> {
    try {
      const voices = await this.getVoicesForPlan(userPlan);
      return Array.from(new Set(voices.map(v => v.gender).filter(Boolean))).sort();
    } catch (error) {
      console.error('Error fetching genders:', error);
      return [];
    }
  }

  /** ✅ Get available languages */
  static async getAvailableLanguages(userPlan: string): Promise<string[]> {
    try {
      const voices = await this.getVoicesForPlan(userPlan);
      return Array.from(new Set(voices.map(v => v.language?.toLowerCase()).filter(Boolean))).sort();
    } catch (error) {
      console.error('Error fetching languages:', error);
      return [];
    }
  }

  /** ✅ Search voices with filters */
  static async searchVoices(
    searchTerm: string,
    filters: { category?: string; gender?: string; language?: string; plan?: string },
    userPlan: string
  ): Promise<PrebuiltVoice[]> {
    try {
      let voices = await this.getVoicesForPlan(userPlan);

      if (filters.language)
        voices = voices.filter(v => v.language?.toLowerCase() === filters.language?.toLowerCase());
      if (filters.category)
        voices = voices.filter(v => v.category?.toLowerCase() === filters.category?.toLowerCase());
      if (filters.gender)
        voices = voices.filter(v => v.gender?.toLowerCase() === filters.gender?.toLowerCase());
      if (filters.plan)
        voices = voices.filter(v => v.required_plan === filters.plan);

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        voices = voices.filter(v =>
          [v.name, v.description, v.category, v.gender, v.accent]
            .filter(Boolean)
            .some(field => field!.toLowerCase().includes(term))
        );
      }

      return voices;
    } catch (error) {
      console.error('Error searching voices:', error);
      return [];
    }
  }

  /** ✅ Validate if user can use a voice */
  static async validateVoiceAccess(
    voiceId: string,
    userPlan: string
  ): Promise<{ canAccess: boolean; message?: string; voice?: PrebuiltVoice }> {
    try {
      const voice = await this.getVoiceById(voiceId);
      if (!voice)
        return { canAccess: false, message: 'Voice not found or inactive' };

      const canAccess = this.canAccessVoice(voice, userPlan);
      if (!canAccess)
        return {
          canAccess: false,
          message: `This voice requires ${voice.required_plan} plan. Please upgrade.`,
          voice,
        };

      return { canAccess: true, voice };
    } catch (error) {
      console.error('Error validating voice access:', error);
      return { canAccess: false, message: 'Error validating voice access' };
    }
  }

  /** ✅ Track voice usage locally (SSR-safe) */
  static trackVoiceUsage(voiceId: string): void {
    try {
      if (typeof window === 'undefined') return;
      const usageKey = `voice_usage_${voiceId}`;
      const currentUsage = parseInt(localStorage.getItem(usageKey) || '0', 10);
      localStorage.setItem(usageKey, (currentUsage + 1).toString());
    } catch (error) {
      console.error('Error tracking voice usage:', error);
    }
  }

  /** ✅ Get voice usage count (SSR-safe) */
  static getVoiceUsageCount(voiceId: string): number {
    try {
      if (typeof window === 'undefined') return 0;
      const usageKey = `voice_usage_${voiceId}`;
      return parseInt(localStorage.getItem(usageKey) || '0', 10);
    } catch (error) {
      console.error('Error getting voice usage count:', error);
      return 0;
    }
  }

  /** ✅ Voice statistics by plan/category/language */
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
          premium: voices.filter(v => v.required_plan === 'premium').length,
        },
        byCategory: {} as Record<string, number>,
        byLanguage: {} as Record<string, number>,
      };

      voices.forEach(v => {
        if (v.category) stats.byCategory[v.category] = (stats.byCategory[v.category] || 0) + 1;
        if (v.language) stats.byLanguage[v.language] = (stats.byLanguage[v.language] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('Error getting voice stats:', error);
      return {
        total: 0,
        byPlan: { free: 0, pro: 0, premium: 0 },
        byCategory: {},
        byLanguage: {},
      };
    }
  }
}

/** ✅ Helper: Badge variant for UI */
export function getPlanBadgeVariant(
  plan: string,
  userPlan: string
): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (plan === 'free') return 'secondary';
  if (plan === 'pro') return ['pro', 'premium'].includes(userPlan) ? 'default' : 'outline';
  if (plan === 'premium') return userPlan === 'premium' ? 'default' : 'outline';
  return 'outline';
}

/** ✅ Helper: Format plan name for display */
export function formatPlanName(plan: string): string {
  return plan ? plan.charAt(0).toUpperCase() + plan.slice(1) : '';
}
