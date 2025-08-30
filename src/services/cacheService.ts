
class CacheService {
  private cache = new Map<string, any>();
  private timestamps = new Map<string, number>();
  private readonly TTL = 0; // Disabled caching - set to 0

  set(key: string, data: any): void {
    // Caching disabled - do nothing
    return;
  }

  get(key: string): any | null {
    // Caching disabled - always return null
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
