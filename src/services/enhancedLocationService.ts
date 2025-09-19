import { VPNDetectionService, LocationData } from './vpnDetectionService';

export interface LocationServiceResult {
  isAllowed: boolean;
  isVPN: boolean;
  country: string;
  countryCode: string;
  message: string;
  locationData?: LocationData;
}

export class EnhancedLocationService {
  private static readonly LOCATION_CACHE_KEY = 'user_location_cache';
  private static readonly CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours

  /**
   * Get cached location data
   */
  private static getCachedLocation(): LocationData | null {
    try {
      const cache = localStorage.getItem(this.LOCATION_CACHE_KEY);
      if (!cache) return null;

      const parsed = JSON.parse(cache);
      if (parsed.timestamp > Date.now() - this.CACHE_DURATION) {
        return parsed.data;
      }
    } catch (error) {
      console.warn('Error reading location cache:', error);
    }
    return null;
  }

  /**
   * Cache location data
   */
  private static setCachedLocation(data: LocationData): void {
    try {
      const cache = {
        data,
        timestamp: Date.now()
      };
      localStorage.setItem(this.LOCATION_CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.warn('Error setting location cache:', error);
    }
  }

  /**
   * Enhanced location detection with VPN checking
   */
  static async detectUserLocation(): Promise<LocationServiceResult> {
    try {
      // Check cache first
      const cached = this.getCachedLocation();
      if (cached) {
        return this.validateLocation(cached);
      }

      // Perform fresh detection
      const vpnResult = await VPNDetectionService.detectVPN();
      
      const locationData: LocationData = {
        country: vpnResult.country,
        countryCode: vpnResult.countryCode,
        city: vpnResult.city,
        region: vpnResult.region,
        ipAddress: vpnResult.ipAddress,
        isVPN: vpnResult.isVPN,
        vpnProvider: vpnResult.provider
      };

      // Cache the result
      this.setCachedLocation(locationData);

      return this.validateLocation(locationData);
    } catch (error) {
      console.error('Location detection failed:', error);
      return {
        isAllowed: false,
        isVPN: false,
        country: 'Unknown',
        countryCode: 'XX',
        message: 'Unable to verify your location. Please ensure you have a stable internet connection and try again.'
      };
    }
  }

  /**
   * Validate location for India-only service
   */
  private static validateLocation(locationData: LocationData): LocationServiceResult {
    // Check for VPN/Proxy
    if (locationData.isVPN) {
      return {
        isAllowed: false,
        isVPN: true,
        country: locationData.country,
        countryCode: locationData.countryCode,
        message: `VPN/Proxy detected (${locationData.vpnProvider || 'Unknown provider'}). Please disable your VPN and try again.`,
        locationData
      };
    }

    // Check for India
    const isIndian = locationData.countryCode === 'IN';
    
    if (!isIndian) {
      return {
        isAllowed: false,
        isVPN: false,
        country: locationData.country,
        countryCode: locationData.countryCode,
        message: `This service is only available in India. Your location: ${locationData.country}`,
        locationData
      };
    }

    return {
      isAllowed: true,
      isVPN: false,
      country: locationData.country,
      countryCode: locationData.countryCode,
      message: 'Welcome! Access granted from India.',
      locationData
    };
  }

  /**
   * Save user location after successful authentication
   */
  static async saveUserLocation(userId: string): Promise<void> {
    try {
      const result = await this.detectUserLocation();
      
      if (result.locationData && result.isAllowed) {
        await VPNDetectionService.saveUserLocation(userId, result.locationData);
        
        // Also save in cookie for quick access
        document.cookie = `user_country=IN; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Strict`;
        document.cookie = `location_verified=true; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Strict`;
      }
    } catch (error) {
      console.error('Failed to save user location:', error);
    }
  }

  /**
   * Quick location check using cookies (no API calls)
   */
  static isLocationVerified(): boolean {
    try {
      const cookies = document.cookie.split(';');
      const verified = cookies.find(cookie => cookie.trim().startsWith('location_verified='));
      const country = cookies.find(cookie => cookie.trim().startsWith('user_country='));
      
      return verified?.includes('true') && country?.includes('IN');
    } catch (error) {
      return false;
    }
  }

  /**
   * Clear location cache and cookies
   */
  static clearLocationData(): void {
    try {
      localStorage.removeItem(this.LOCATION_CACHE_KEY);
      document.cookie = 'user_country=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      document.cookie = 'location_verified=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      VPNDetectionService.clearCache();
    } catch (error) {
      console.warn('Error clearing location data:', error);
    }
  }

  /**
   * Force refresh location data
   */
  static async refreshLocation(): Promise<LocationServiceResult> {
    this.clearLocationData();
    return await this.detectUserLocation();
  }
}