
class CacheService {
  private cache = new Map<string, any>();
  private timestamps = new Map<string, number>();
  private readonly TTL = 30 * 60 * 1000; // 30 minutes cache

  // Generate cache key from text and settings
  generateCacheKey(text: string, settings: any): string {
    const normalized = {
      text: text.trim().toLowerCase(),
      voiceId: settings.voice_id,
      language: settings.language,
      speed: settings.speed,
      pitch: settings.pitch
    };
    return btoa(JSON.stringify(normalized)).slice(0, 50);
  }

  set(key: string, data: any): void {
    this.cache.set(key, data);
    this.timestamps.set(key, Date.now());
    
    try {
      localStorage.setItem(`cache_${key}`, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.warn('Failed to persist cache:', error);
    }
  }

  get(key: string): any | null {
    // Check memory cache first
    const timestamp = this.timestamps.get(key);
    if (timestamp && Date.now() - timestamp < this.TTL) {
      return this.cache.get(key);
    }

    // Check localStorage
    try {
      const stored = localStorage.getItem(`cache_${key}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Date.now() - parsed.timestamp < this.TTL) {
          this.cache.set(key, parsed.data);
          this.timestamps.set(key, parsed.timestamp);
          return parsed.data;
        }
      }
    } catch (error) {
      console.warn('Failed to retrieve cache:', error);
    }

    return null;
  }

  delete(key: string): void {
    // Clear any existing cache data
    this.cache.delete(key);
    this.timestamps.delete(key);
    try {
      localStorage.removeItem(`cache_${key}`);
    } catch (error) {
      // Ignore errors
    }
  }

  clear(): void {
    this.cache.clear();
    this.timestamps.clear();
    
    // Clear all cache items from localStorage
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('cache_')) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      // Ignore errors
    }
  }

  // Check if we're online
  isOnline(): boolean {
    return navigator.onLine;
  }

  // Store data for offline use
  setOfflineData(key: string, data: any): void {
    try {
      localStorage.setItem(`offline_${key}`, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.warn('Failed to store offline data:', error);
    }
  }

  getOfflineData(key: string): any | null {
    try {
      const stored = localStorage.getItem(`offline_${key}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.data;
      }
    } catch (error) {
      console.warn('Failed to retrieve offline data:', error);
    }
    return null;
  }
}

export const cacheService = new CacheService();
