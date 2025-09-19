import { supabase } from '@/integrations/supabase/client';

export interface LocationCache {
  countryCode: string;
  country: string;
  isIndian: boolean;
  partialIP: string;
  timestamp: number;
  sessionId: string;
}

export class LocationCacheService {
  private static readonly CACHE_KEY = 'user_location_cache';
  private static readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  
  // Generate session ID for this browser session
  private static getSessionId(): string {
    let sessionId = sessionStorage.getItem('location_session_id');
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem('location_session_id', sessionId);
    }
    return sessionId;
  }

  // Mask IP for privacy (only store first 2 octets)
  private static maskIP(ip: string): string {
    if (ip.includes(':')) {
      // IPv6 - keep only first 4 parts
      return ip.split(':').slice(0, 4).join(':') + '::';
    } else {
      // IPv4 - keep only first 2 octets
      return ip.split('.').slice(0, 2).join('.') + '.x.x';
    }
  }

  // Check if cached location is valid
  static getCachedLocation(): LocationCache | null {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      if (!cached) return null;

      const data: LocationCache = JSON.parse(cached);
      const now = Date.now();

      // Check if cache is expired
      if (now - data.timestamp > this.CACHE_DURATION) {
        this.clearCache();
        return null;
      }

      // Check if same session
      if (data.sessionId !== this.getSessionId()) {
        return null;
      }

      return data;
    } catch (error) {
      console.warn('Error reading location cache:', error);
      this.clearCache();
      return null;
    }
  }

  // Cache location data
  static async cacheLocation(ip: string, countryCode: string, country: string): Promise<LocationCache> {
    const locationCache: LocationCache = {
      countryCode,
      country,
      isIndian: countryCode === 'IN',
      partialIP: this.maskIP(ip),
      timestamp: Date.now(),
      sessionId: this.getSessionId()
    };

    try {
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(locationCache));
      
      // Also set a simple cookie for quick server-side access
      document.cookie = `user_country=${countryCode}; path=/; max-age=${this.CACHE_DURATION / 1000}; secure; samesite=strict`;
    } catch (error) {
      console.warn('Error caching location:', error);
    }

    return locationCache;
  }

  // Fetch location from API (only when needed)
  static async fetchLocation(): Promise<LocationCache> {
    try {
      const response = await fetch('https://ipapi.co/json/', {
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) {
        throw new Error('IP detection failed');
      }

      const data = await response.json();
      return await this.cacheLocation(
        data.ip || 'unknown',
        data.country_code || 'XX',
        data.country_name || 'Unknown'
      );
    } catch (error) {
      console.error('Location fetch failed:', error);
      
      // Return cached data if available, otherwise fallback
      const cached = this.getCachedLocation();
      if (cached) return cached;

      // Ultimate fallback
      return await this.cacheLocation('unknown', 'XX', 'Unknown');
    }
  }

  // Get location (cached or fresh)
  static async getLocation(): Promise<LocationCache> {
    const cached = this.getCachedLocation();
    if (cached) {
      return cached;
    }

    return await this.fetchLocation();
  }

  // Save user location to database (only for authenticated users)
  static async saveUserLocation(userId: string, locationData: LocationCache): Promise<void> {
    try {
      // Update profile with country information
      await supabase.from('profiles').upsert({
        user_id: userId,
        country: locationData.country,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

      // Also save to user_locations if table exists
      try {
        await supabase.from('user_locations').upsert({
          user_id: userId,
          country_code: locationData.countryCode,
          country_name: locationData.country,
          ip_address: locationData.partialIP,
          created_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });
      } catch (err) {
        // Table might not exist, ignore this error
        console.warn('user_locations table not found, skipping:', err);
      }
    } catch (error) {
      console.error('Error saving user location:', error);
    }
  }

  // Clear cache
  static clearCache(): void {
    try {
      localStorage.removeItem(this.CACHE_KEY);
      document.cookie = 'user_country=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    } catch (error) {
      console.warn('Error clearing location cache:', error);
    }
  }

  // Quick country check from cookie
  static getCountryFromCookie(): string | null {
    try {
      const cookies = document.cookie.split(';');
      const countryCookie = cookies.find(c => c.trim().startsWith('user_country='));
      return countryCookie ? countryCookie.split('=')[1] : null;
    } catch (error) {
      return null;
    }
  }
}
