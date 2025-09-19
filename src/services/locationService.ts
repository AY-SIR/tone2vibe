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
  // List of APIs and how to map their response
  private static apis = [
    {
      url: 'https://ipapi.co/json/',
      map: (data: any) => ({
        country: data.country_name || 'Unknown',
        countryCode: data.country_code || 'Unknown',
        ip: data.ip,
      }),
    },
    {
      url: 'https://ipwho.is/json/',
      map: (data: any) => ({
        country: data.country || 'Unknown',
        countryCode: data.country_code || 'Unknown',
        ip: data.ip,
      }),
    },
    {
      url: 'https://geolocation-db.com/json/',
      map: (data: any) => ({
        country: data.country_name || 'Unknown',
        countryCode: data.country_code || 'Unknown',
        ip: data.IPv4,
      }),
    },
  ];

  /** Detects user location using multiple APIs */
  static async getUserLocation(): Promise<LocationData> {
    for (const api of this.apis) {
      try {
        const res = await fetch(api.url, { headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error(`Failed API: ${api.url}`);
        const data = await res.json();
        return api.map(data);
      } catch (err) {
        console.warn(`API failed: ${api.url}`, err);
      }
    }
    console.error('All location APIs failed, using default.');
    return { country: 'Unknown', countryCode: 'Unknown' };
  }

  /** Detects user location */
  static async detectUserLocation(): Promise<LocationData> {
    return await this.getUserLocation();
  }

  /** Checks if user is from India */
  static isIndianUser(countryCode: string): boolean {
    return countryCode.toUpperCase() === 'IN';
  }

  /** Returns pricing data */
  static getPricing(): PricingData {
    return {
      currency: 'INR',
      symbol: '₹',
      plans: { pro: { price: 99, originalPrice: 99 }, premium: { price: 299, originalPrice: 299 } },
      words: { pricePerThousand: 31 },
    };
  }

  /** Saves user location to Supabase */
  static async saveUserLocation(userId: string, locationData: LocationData): Promise<void> {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          country: locationData.country || 'Unknown',
          country_code: locationData.countryCode || 'Unknown',
          ip: locationData.ip || null,
        })
        .eq('user_id', userId);
      if (error) throw error;
    } catch (err) {
      console.error('Error saving location to Supabase:', err);
    }
  }

  /** Gets user location from Supabase */
  static async getUserLocationFromDb(userId: string): Promise<LocationData> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('country, country_code, ip')
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        return { country: 'Unknown', countryCode: 'Unknown' };
      }

      return {
        country: data.country || 'Unknown',
        countryCode: data.country_code?.toUpperCase() || 'Unknown',
        ip: data.ip || undefined,
      };
    } catch (err) {
      console.error('Error fetching location from DB:', err);
      return { country: 'Unknown', countryCode: 'Unknown' };
    }
  }
}
