
class CacheService {
  private cache = new Map<string, any>();
  private timestamps = new Map<string, number>();
  private readonly TTL = 5 * 60 * 1000; // 5 minutes

  set(key: string, data: any): void {
    this.cache.set(key, data);
    this.timestamps.set(key, Date.now());
    
    // Store in localStorage for persistence
    try {
      localStorage.setItem(`cache_${key}`, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.warn('Failed to store in localStorage:', error);
    }
  }

  get(key: string): any | null {
    const timestamp = this.timestamps.get(key);
    
    if (timestamp && Date.now() - timestamp > this.TTL) {
      this.delete(key);
      return null;
    }

    let data = this.cache.get(key);
    
    // Fallback to localStorage
    if (!data) {
      try {
        const stored = localStorage.getItem(`cache_${key}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Date.now() - parsed.timestamp < this.TTL) {
            data = parsed.data;
            this.cache.set(key, data);
            this.timestamps.set(key, parsed.timestamp);
          } else {
            localStorage.removeItem(`cache_${key}`);
          }
        }
      } catch (error) {
        console.warn('Failed to retrieve from localStorage:', error);
      }
    }

    return data || null;
  }

  delete(key: string): void {
    this.cache.delete(key);
    this.timestamps.delete(key);
    localStorage.removeItem(`cache_${key}`);
  }

  clear(): void {
    this.cache.clear();
    this.timestamps.clear();
    
    // Clear cache items from localStorage
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('cache_')) {
        localStorage.removeItem(key);
      }
    });
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
