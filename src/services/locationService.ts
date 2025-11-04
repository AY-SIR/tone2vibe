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
      url: 'https://ipwho.is/',
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
    {
      url: 'https://api.country.is/',
      map: (data: any) => ({
        country: data.country || 'Unknown',
        countryCode: data.country || 'Unknown',
        ip: data.ip,
      }),
    },
  ];

  /** Detects user location using multiple APIs with silent fallback */
  static async getUserLocation(): Promise<LocationData> {
    // Try each API silently
    for (const api of this.apis) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

        const res = await fetch(api.url, {
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!res.ok) continue;

        const data = await res.json();
        const location = api.map(data);

        // Validate we got useful data
        if (location.countryCode && location.countryCode !== 'Unknown') {
          return location;
        }
      } catch (error) {
        // Silently continue to next API
        continue;
      }
    }

    // All APIs failed - return default without logging
    return { country: 'Unknown', countryCode: 'Unknown' };
  }

  /** Detects user location - guaranteed to return something */
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
      plans: {
        pro: { price: 99, originalPrice: 99 },
        premium: { price: 299, originalPrice: 299 },
      },
    };
  }

  /** Saves user location to Supabase - silent operation */
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
      // Silently ignore all errors
    }
  }

  /** Gets user location from Supabase - silent fallback */
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
        countryCode: data.country_code || 'Unknown',
        ip: data.ip || undefined,
      };
    } catch {
      return { country: 'Unknown', countryCode: 'Unknown' };
    }
  }
}