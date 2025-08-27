
import { supabase } from '@/integrations/supabase/client';

export interface VoiceCollection {
  id: string;
  voice_id: string;
  name: string;
  category: 'basic' | 'professional' | 'cartoon' | 'celebrity' | 'anime';
  gender?: string;
  accent?: string;
  description: string;
  required_plan: 'free' | 'pro' | 'premium';
  audio_preview_url?: string;
  created_at: string;
}

export class VoiceCollectionService {
  // Mock voice data for different plans
  private static getMockVoices(): VoiceCollection[] {
    return [
      // Free Plan Voices (3 basic voices)
      {
        id: '1',
        voice_id: 'basic_john',
        name: 'John - Professional Male',
        category: 'basic',
        gender: 'male',
        accent: 'american',
        description: 'Clear, professional male voice suitable for business content',
        required_plan: 'free',
        created_at: new Date().toISOString()
      },
      {
        id: '2',
        voice_id: 'basic_sarah',
        name: 'Sarah - Professional Female',
        category: 'basic',
        gender: 'female',
        accent: 'american',
        description: 'Warm, professional female voice perfect for presentations',
        required_plan: 'free',
        created_at: new Date().toISOString()
      },
      {
        id: '3',
        voice_id: 'basic_david',
        name: 'David - Narrator',
        category: 'basic',
        gender: 'male',
        accent: 'british',
        description: 'Deep, authoritative voice ideal for storytelling',
        required_plan: 'free',
        created_at: new Date().toISOString()
      },

      // Pro Plan Additional Voices (professional + cartoon)
      {
        id: '4',
        voice_id: 'pro_emma',
        name: 'Emma - Corporate',
        category: 'professional',
        gender: 'female',
        accent: 'british',
        description: 'Sophisticated female voice for corporate communications',
        required_plan: 'pro',
        created_at: new Date().toISOString()
      },
      {
        id: '5',
        voice_id: 'pro_marcus',
        name: 'Marcus - Executive',
        category: 'professional',
        gender: 'male',
        accent: 'american',
        description: 'Confident executive voice for leadership content',
        required_plan: 'pro',
        created_at: new Date().toISOString()
      },
      {
        id: '6',
        voice_id: 'cartoon_mickey',
        name: 'Mickey Style',
        category: 'cartoon',
        gender: 'male',
        description: 'High-pitched, cheerful cartoon character voice',
        required_plan: 'pro',
        created_at: new Date().toISOString()
      },
      {
        id: '7',
        voice_id: 'cartoon_minnie',
        name: 'Minnie Style',
        category: 'cartoon',
        gender: 'female',
        description: 'Sweet, high-pitched female cartoon voice',
        required_plan: 'pro',
        created_at: new Date().toISOString()
      },
      {
        id: '8',
        voice_id: 'cartoon_bugs',
        name: 'Bugs Style',
        category: 'cartoon',
        gender: 'male',
        description: 'Witty, classic cartoon rabbit character voice',
        required_plan: 'pro',
        created_at: new Date().toISOString()
      },

      // Premium Plan Additional Voices (celebrity + anime)
      {
        id: '9',
        voice_id: 'celebrity_morgan',
        name: 'Morgan Style',
        category: 'celebrity',
        gender: 'male',
        accent: 'american',
        description: 'Deep, authoritative voice reminiscent of famous narrators',
        required_plan: 'premium',
        created_at: new Date().toISOString()
      },
      {
        id: '10',
        voice_id: 'celebrity_scarlett',
        name: 'Scarlett Style',
        category: 'celebrity',
        gender: 'female',
        accent: 'american',
        description: 'Sultry, sophisticated female celebrity voice',
        required_plan: 'premium',
        created_at: new Date().toISOString()
      },
      {
        id: '11',
        voice_id: 'anime_goku',
        name: 'Goku Style',
        category: 'anime',
        gender: 'male',
        description: 'Energetic, heroic anime character voice',
        required_plan: 'premium',
        created_at: new Date().toISOString()
      },
      {
        id: '12',
        voice_id: 'anime_sailor',
        name: 'Sailor Moon Style',
        category: 'anime',
        gender: 'female',
        description: 'Bright, magical girl anime character voice',
        required_plan: 'premium',
        created_at: new Date().toISOString()
      },
      {
        id: '13',
        voice_id: 'anime_naruto',
        name: 'Naruto Style',
        category: 'anime',
        gender: 'male',
        description: 'Determined, young ninja anime character voice',
        required_plan: 'premium',
        created_at: new Date().toISOString()
      }
    ];
  }

  // Get voices available for user's plan
  static async getVoicesForPlan(userPlan: string): Promise<VoiceCollection[]> {
    try {
      // For now, use mock data. In production, this would query Supabase
      const allVoices = this.getMockVoices();
      
      let allowedPlans = ['free'];
      
      if (userPlan === 'pro') {
        allowedPlans = ['free', 'pro'];
      } else if (userPlan === 'premium') {
        allowedPlans = ['free', 'pro', 'premium'];
      }

      return allVoices.filter(voice => allowedPlans.includes(voice.required_plan));
    } catch (error) {
      console.error('Error fetching voice collections:', error);
      return [];
    }
  }

  // Get all voices (for admin purposes)
  static async getAllVoices(): Promise<VoiceCollection[]> {
    try {
      return this.getMockVoices();
    } catch (error) {
      console.error('Error fetching all voices:', error);
      return [];
    }
  }

  // Get voices by category
  static async getVoicesByCategory(category: string, userPlan: string): Promise<VoiceCollection[]> {
    try {
      const voices = await this.getVoicesForPlan(userPlan);
      return voices.filter(voice => voice.category === category);
    } catch (error) {
      console.error('Error fetching voices by category:', error);
      return [];
    }
  }

  // Check if user can access voice
  static canAccessVoice(voice: VoiceCollection, userPlan: string): boolean {
    if (voice.required_plan === 'free') return true;
    if (voice.required_plan === 'pro' && ['pro', 'premium'].includes(userPlan)) return true;
    if (voice.required_plan === 'premium' && userPlan === 'premium') return true;
    return false;
  }

  // Get plan requirements for voice access
  static getVoiceAccessInfo(userPlan: string) {
    const info = {
      free: {
        categories: ['basic'],
        count: 3,
        description: 'Basic voices for everyday use'
      },
      pro: {
        categories: ['basic', 'professional', 'cartoon'],
        count: 8,
        description: 'Professional and cartoon character voices'
      },
      premium: {
        categories: ['basic', 'professional', 'cartoon', 'celebrity', 'anime'],
        count: 13,
        description: 'All voices including celebrity and anime characters'
      }
    };

    return info[userPlan as keyof typeof info] || info.free;
  }
}
