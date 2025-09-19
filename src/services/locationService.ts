
import { supabase } from '@/integrations/supabase/client';

export interface LocationData {
  country: string;
  countryCode: string;
  ip?: string;
}

export interface PricingData {
  currency: string;
  symbol: string;
  plans: {
    pro: { price: number; originalPrice: number };
    premium: { price: number; originalPrice: number };
  };
  words: { pricePerThousand: number };
}

export class LocationService {
  static async getUserLocation(): Promise<LocationData | null> {
    try {
      const response = await fetch('https://ipapi.co/json/', {
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch location data');
      }

      const data = await response.json();

      return {
        country: data.country_name || 'Unknown',
        countryCode: data.country_code || 'Unknown',
        ip: data.ip
      };
    } catch (error) {
      console.error('Error fetching location:', error);
      return {
        country: 'Unknown',
        countryCode: 'Unknown'
      };
    }
  }

  static async detectUserLocation(): Promise<LocationData> {
    const location = await this.getUserLocation();
    return location || { country: 'Unknown', countryCode: 'Unknown' };
  }

  // Check if user is from India
  static isIndianUser(countryCode: string): boolean {
    return countryCode === 'IN';
  }

  static getPricing(): PricingData {
    return {
      currency: 'INR',
      symbol: '₹',
      plans: {
        pro: { price: 99, originalPrice: 99 },
        premium: { price: 299, originalPrice: 299 }
      },
      words: { pricePerThousand: 31 }
    };
  }

  static async saveUserLocation(userId: string, locationData: LocationData): Promise<void> {
    try {
      await supabase
        .from('profiles')
        .update({
          country: locationData.country
        })
        .eq('user_id', userId);
    } catch (error) {
      console.error('Error saving location:', error);
    }
  }

  static async getUserLocationFromDb(userId: string): Promise<LocationData | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('country')
        .eq('user_id', userId)
        .single();

      if (error || !data) return null;

      return {
        country: data.country || 'Unknown',
        countryCode: data.country === 'India' ? 'IN' : 'Unknown'
      };
    } catch (error) {
      console.error('Error fetching location from db:', error);
      return null;
    }
  }
}