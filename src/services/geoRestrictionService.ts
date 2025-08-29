import { supabase } from '@/integrations/supabase/client';
import { LocationService } from './locationService';

export interface GeoRestriction {
  isAllowed: boolean;
  countryCode?: string;
  countryName?: string;
  message: string;
}

export class GeoRestrictionService {
  
  // Check if user's country is allowed
  static async checkCountryAccess(): Promise<GeoRestriction> {
    try {
      // Get user's current location
      const location = await LocationService.getUserLocation();
      
      if (!location || !location.ip) {
        return {
          isAllowed: true,
          message: 'Unable to verify location, access granted'
        };
      }

      // Get blocked countries from database
      const { data: blockedCountries, error } = await supabase
        .from('blocked_countries')
        .select('country_code, country_name');

      if (error) {
        console.error('Error fetching blocked countries:', error);
        return {
          isAllowed: true, // Allow access on error
          message: 'Location verification failed, access granted'
        };
      }

      // Extract country code from location (like "CN", "PK")
      const userCountryCode = await this.getCountryCodeFromIP(location.ip);
      
      if (!userCountryCode) {
        return {
          isAllowed: true,
          message: 'Location verified, access granted'
        };
      }

      // Check if user's country is blocked
      const isBlocked = blockedCountries?.some(
        country => country.country_code === userCountryCode
      );

      if (isBlocked) {
        const blockedCountry = blockedCountries.find(
          country => country.country_code === userCountryCode
        );
        
        return {
          isAllowed: false,
          countryCode: userCountryCode,
          countryName: blockedCountry?.country_name,
          message: `Service is not available in ${blockedCountry?.country_name || 'your country'}.`
        };
      }

      return {
        isAllowed: true,
        countryCode: userCountryCode,
        message: 'Location verified, access granted'
      };

    } catch (error) {
      console.error('Geo restriction check failed:', error);
      return {
        isAllowed: true, // Allow access on error
        message: 'Location verification failed, access granted'
      };
    }
  }

  // Get country code from IP address
  private static async getCountryCodeFromIP(ip: string): Promise<string | null> {
    try {
      // Use a different IP service for country code detection
      const response = await fetch(`https://ipapi.co/${ip}/country/`);
      if (response.ok) {
        const countryCode = await response.text();
        return countryCode.trim().toUpperCase();
      }
      return null;
    } catch (error) {
      console.error('Failed to get country code from IP:', error);
      return null;
    }
  }

  // Force currency based on country
  static getForcedCurrency(countryCode?: string): 'INR' | 'USD' {
    if (countryCode === 'IN') {
      return 'INR';
    }
    return 'USD';
  }

  // Check if user can make payments from their country
  static async validatePaymentLocation(): Promise<GeoRestriction> {
    const accessCheck = await this.checkCountryAccess();
    
    if (!accessCheck.isAllowed) {
      return {
        ...accessCheck,
        message: `Payments are not available in ${accessCheck.countryName || 'your country'}.`
      };
    }

    return accessCheck;
  }
}