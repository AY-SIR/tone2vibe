// Simplified custom voice service without unused edge functions
import { supabase } from '@/integrations/supabase/client';

export interface CustomVoiceSettings {
  speed: number;
  pitch: number;
  volume: number;
  style?: string;
  emotion?: string;
}

export class CustomVoiceService {
  static async getUserLocation(): Promise<any> {
    try {
      // Use browser geolocation API instead of edge function
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();
      
      return {
        country: data.country_name || 'Unknown',
        country_code: data.country_code || 'US',
        currency: data.country_code === 'IN' ? 'INR' : 'USD',
        is_allowed: true
      };
    } catch (error) {
      console.error('Location service error:', error);
      return {
        country: 'US',
        currency: 'USD',
        is_allowed: true
      };
    }
  }
}