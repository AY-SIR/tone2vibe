class CacheService {
  private cache = new Map<string, any>();
  private timestamps = new Map<string, number>();
  private readonly TTL = 3600000; // 1 hour cache

  // Generate cache key from text + settings
  generateCacheKey(text: string, settings: any): string {
    const settingsStr = JSON.stringify(settings);
    return `voice_${btoa(text).substring(0, 50)}_${btoa(settingsStr).substring(0, 50)}`;
  }

  set(key: string, data: any): void {
    this.cache.set(key, data);
    this.timestamps.set(key, Date.now());
    
    // Persist to localStorage
    try {
      localStorage.setItem(`cache_${key}`, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.warn('Cache storage failed:', error);
    }
  }

  get(key: string): any | null {
    // Check memory cache first
    if (this.cache.has(key)) {
      const timestamp = this.timestamps.get(key)!;
      if (Date.now() - timestamp < this.TTL) {
        return this.cache.get(key);
      } else {
        this.cache.delete(key);
        this.timestamps.delete(key);
      }
    }

    // Check localStorage
    try {
      const stored = localStorage.getItem(`cache_${key}`);
      if (stored) {
        const { data, timestamp } = JSON.parse(stored);
        if (Date.now() - timestamp < this.TTL) {
          this.cache.set(key, data);
          this.timestamps.set(key, timestamp);
          return data;
        } else {
          localStorage.removeItem(`cache_${key}`);
        }
      }
    } catch (error) {
      console.warn('Cache retrieval failed:', error);
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
