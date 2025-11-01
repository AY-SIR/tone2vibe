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
}

export class LocationService {
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

  /** Detects user location using multiple APIs — always succeeds silently */
  static async getUserLocation(): Promise<LocationData> {
    for (const api of this.apis) {
      try {
        const res = await fetch(api.url, { headers: { Accept: 'application/json' } });
        if (!res.ok) continue;
        const data = await res.json();
        return api.map(data);
      } catch {
        continue;
      }
    }
    return { country: 'Unknown', countryCode: 'Unknown' };
  }

  /** Detects user location — always returns something */
  static async detectUserLocation(): Promise<LocationData> {
    try {
      return await this.getUserLocation();
    } catch {
      return { country: 'Unknown', countryCode: 'Unknown' };
    }
  }

  /** Checks if user is from India */
  static isIndianUser(countryCode: string): boolean {
    return countryCode?.toUpperCase() === 'IN';
  }

  /** Returns pricing data */
  static getPricing(): PricingData {
    return {
      currency: 'INR',
      symbol: '₹',
      plans: { pro: { price: 99, originalPrice: 99 }, premium: { price: 299, originalPrice: 299 } },
    };
  }

  /** Saves user location to Supabase — never fails or throws */
  static async saveUserLocation(userId: string, locationData: LocationData): Promise<void> {
    try {
      await supabase
        .from('profiles')
        .update({
          country: locationData.country || 'Unknown',
          country_code: locationData.countryCode || 'Unknown',
          ip: locationData.ip || null,
        })
        .eq('user_id', userId);
    } catch {
      // silently ignore errors
    }
  }

  /** Gets user location from Supabase — always succeeds silently */
  static async getUserLocationFromDb(userId: string): Promise<LocationData> {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('country, country_code, ip')
        .eq('user_id', userId)
        .single();

      if (!data) {
        return { country: 'Unknown', countryCode: 'Unknown' };
      }

      return {
        country: data.country || 'Unknown',
        countryCode: data.country_code || 'Unknown',
        ip: data.ip || undefined,
      };
    } catch {
      return { country: 'Unknown', countryCode: 'Unknown' };
    }
  }
}
