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
  private static readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24h
  private static locationPromise: Promise<LocationCache> | null = null;

  /** Generate or retrieve session ID */
  private static getSessionId(): string {
    try {
      let sessionId = sessionStorage.getItem('location_session_id');
      if (!sessionId) {
        sessionId = crypto.randomUUID();
        sessionStorage.setItem('location_session_id', sessionId);
      }
      return sessionId;
    } catch {
      return 'unknown-session';
    }
  }

  /** Mask IP for privacy */
  private static maskIP(ip: string): string {
    try {
      if (!ip) return 'x.x.x.x';
      if (ip.includes(':')) return ip.split(':').slice(0, 4).join(':') + '::';
      return ip.split('.').slice(0, 2).join('.') + '.x.x';
    } catch {
      return 'x.x.x.x';
    }
  }

  /** Fetch location from cache if valid */
  public static getCachedLocation(): LocationCache | null {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      if (!cached) return null;
      const data: LocationCache = JSON.parse(cached);
      if (Date.now() - data.timestamp > this.CACHE_DURATION) {
        this.clearCache();
        return null;
      }
      return data;
    } catch {
      this.clearCache();
      return null;
    }
  }

  /** Save location to cache + cookies */
  private static async cacheLocation(ip: string, countryCode: string, country: string): Promise<LocationCache> {
    const countryCodeVal = (countryCode || 'XX').toUpperCase();
    const countryVal = country || 'Unknown';
    const locationCache: LocationCache = {
      countryCode: countryCodeVal,
      country: countryVal,
      isIndian: countryCodeVal === 'IN',
      partialIP: this.maskIP(ip),
      timestamp: Date.now(),
      sessionId: this.getSessionId(),
    };

    try {
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(locationCache));
      const maxAge = Math.floor(this.CACHE_DURATION / 1000);
      const secureFlag = location.origin.startsWith('https:') ? 'secure;' : '';
      document.cookie = `user_country=${countryCodeVal}; path=/; max-age=${maxAge}; ${secureFlag} samesite=strict`;
      document.cookie = `user_ip_verified=${this.maskIP(ip)}; path=/; max-age=${maxAge}; ${secureFlag} samesite=strict`;
      document.cookie = `location_verified=true; path=/; max-age=${maxAge}; ${secureFlag} samesite=strict`;
    } catch {
      // ignore
    }

    return locationCache;
  }

  /** Safe fetch with timeout */
  private static fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 4000) {
    return Promise.race([
      fetch(url, options),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), timeout)
      ),
    ]);
  }

  /** Fetch location from multiple APIs */
  private static async fetchLocation(): Promise<LocationCache> {
    const apis = [
      async () => {
        const res = await this.fetchWithTimeout('https://ipapi.co/json/', { headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error();
        const data = await res.json();
        return { ip: data.ip, countryCode: data.country_code, country: data.country_name };
      },
      async () => {
        const res = await this.fetchWithTimeout('https://ipwho.is/');
        if (!res.ok) throw new Error();
        const data = await res.json();
        return { ip: data.ip, countryCode: data.country_code, country: data.country };
      },
      async () => {
        const res = await this.fetchWithTimeout('https://geolocation-db.com/json/');
        if (!res.ok) throw new Error();
        const data = await res.json();
        return { ip: data.IPv4, countryCode: data.country_code, country: data.country_name };
      },
    ];

    for (const api of apis) {
      try {
        const { ip, countryCode, country } = await api();
        if (ip && countryCode && country) {
          return await this.cacheLocation(ip, countryCode, country);
        }
      } catch {
        continue;
      }
    }

    // Fallback if all APIs fail
    return await this.cacheLocation('unknown', 'XX', 'Other Country');
  }

  /** Get location — first checks cache, otherwise fetches */
  static async getLocation(): Promise<LocationCache> {
    if (this.locationPromise) return this.locationPromise;

    const promise = (async () => {
      const cached = this.getCachedLocation();
      if (cached) return cached;
      return await this.fetchLocation();
    })();

    this.locationPromise = promise;

    const result = await promise;
    this.locationPromise = null;
    return result;
  }

  /** Get location from cookies */
  static getLocationFromCookies(): { isIndian: boolean; country: string | null; ipVerified: string | null } {
    try {
      const cookies = document.cookie.split(';');
      const countryCode = cookies.find(c => c.trim().startsWith('user_country='))?.split('=')[1]?.trim();
      const ipVerified = cookies.find(c => c.trim().startsWith('user_ip_verified='))?.split('=')[1]?.trim();
      const locationVerified = cookies.find(c => c.trim().startsWith('location_verified='))?.split('=')[1]?.trim();

      return {
        isIndian: countryCode === 'IN' && locationVerified === 'true',
        country: countryCode || null,
        ipVerified: ipVerified || null,
      };
    } catch {
      return { isIndian: false, country: null, ipVerified: null };
    }
  }

  /** Save location to Supabase (silent fail) */
  static async saveUserLocation(userId: string, locationData: LocationCache): Promise<void> {
    try {
      await supabase
        .from('profiles')
        .upsert(
          {
            user_id: userId,
            country: locationData.country,
            ip_address: locationData.partialIP,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );

      await supabase
        .from('user_locations')
        .upsert(
          {
            user_id: userId,
            country_code: locationData.countryCode,
            country_name: locationData.country,
            ip_address: locationData.partialIP,
            created_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );
    } catch {
      // silent ignore
    }
  }

  /** Clear cache and cookies */
  static clearCache(): void {
    try {
      localStorage.removeItem(this.CACHE_KEY);
      document.cookie = 'user_country=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      document.cookie = 'user_ip_verified=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      document.cookie = 'location_verified=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    } catch {
      // silent ignore
    }
  }
            }
