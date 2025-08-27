import { supabase } from '@/integrations/supabase/client';

export interface PrebuiltVoice {
  id: string;
  voice_id: string;
  name: string;
  description: string;
  category: string;
  gender?: string;
  accent?: string;
  required_plan: 'free' | 'pro' | 'premium';
  audio_preview_url?: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export class PrebuiltVoiceService {
  // Get voices available for user's plan
  static async getVoicesForPlan(userPlan: string): Promise<PrebuiltVoice[]> {
    try {
      let allowedPlans = ['free'];
      
      if (userPlan === 'pro') {
        allowedPlans = ['free', 'pro'];
      } else if (userPlan === 'premium') {
        allowedPlans = ['free', 'pro', 'premium'];
      }

      const { data, error } = await supabase
        .from('prebuilt_voices')
        .select('*')
        .eq('is_active', true)
        .in('required_plan', allowedPlans)
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('Error fetching prebuilt voices:', error);
        return [];
      }

      return (data || []) as PrebuiltVoice[];
    } catch (error) {
      console.error('Error fetching prebuilt voices:', error);
      return [];
    }
  }

  // Get all active voices (for admin purposes)
  static async getAllActiveVoices(): Promise<PrebuiltVoice[]> {
    try {
      const { data, error } = await supabase
        .from('prebuilt_voices')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('Error fetching all prebuilt voices:', error);
        return [];
      }

      return (data || []) as PrebuiltVoice[];
    } catch (error) {
      console.error('Error fetching all prebuilt voices:', error);
      return [];
    }
  }

  // Get voices by category
  static async getVoicesByCategory(category: string, userPlan: string): Promise<PrebuiltVoice[]> {
    try {
      const voices = await this.getVoicesForPlan(userPlan);
      return voices.filter(voice => voice.category === category);
    } catch (error) {
      console.error('Error fetching voices by category:', error);
      return [];
    }
  }

  // Check if user can access voice
  static canAccessVoice(voice: PrebuiltVoice, userPlan: string): boolean {
    if (voice.required_plan === 'free') return true;
    if (voice.required_plan === 'pro' && ['pro', 'premium'].includes(userPlan)) return true;
    if (voice.required_plan === 'premium' && userPlan === 'premium') return true;
    return false;
  }

  // Get plan requirements for voice access
  static getVoiceAccessInfo(userPlan: string) {
    const info = {
      free: {
        description: 'Basic voices for everyday use',
        available: false
      },
      pro: {
        description: 'Professional AI voices for content creation',
        available: ['pro', 'premium'].includes(userPlan)
      },
      premium: {
        description: 'Premium AI voices with celebrity and character styles',
        available: userPlan === 'premium'
      }
    };

    return info;
  }
}