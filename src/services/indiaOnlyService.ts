// indiaOnlyService.ts
import { LocationService } from './locationService';

export interface AccessCheck {
  isAllowed: boolean;
  countryCode?: string;
  countryName?: string;
  message: string;
}

export class IndiaOnlyService {
  private static LOCAL_STORAGE_KEY(userId: string) {
    return `user_location_${userId}`;
  }

  /**
   * Check if the user is from India
   */
  static async checkIndianAccess(userId?: string): Promise<AccessCheck> {
    try {
      // Try reading cached location first
      if (userId) {
        const cached = localStorage.getItem(this.LOCAL_STORAGE_KEY(userId));
        if (cached) {
          const location = JSON.parse(cached);
          const isIndian = LocationService.isIndianUser(location.countryCode);
          return {
            isAllowed: isIndian,
            countryCode: location.countryCode,
            countryName: location.country,
            message: isIndian
              ? 'Welcome, Indian user!'
              : `This service is only available in India, not in ${location.country}.`,
          };
        }
      }

      // Fetch fresh location
      const location = await LocationService.getUserLocation();

      if (!location || !location.countryCode) {
        return {
          isAllowed: false,
          message: 'This service is only available in India.',
        };
      }

      const isIndian = LocationService.isIndianUser(location.countryCode);

      // Save in localStorage only once if userId exists
      if (userId && isIndian) {
        localStorage.setItem(this.LOCAL_STORAGE_KEY(userId), JSON.stringify(location));
      }

      return {
        isAllowed: isIndian,
        countryCode: location.countryCode,
        countryName: location.country,
        message: isIndian
          ? 'Welcome, Indian user!'
          : `This service is only available in India, not in ${location.country}.`,
      };

    } catch (error) {
      console.error('India access check failed:', error);
      return {
        isAllowed: false,
        message: 'This service is only available in India.',
      };
    }
  }

  /**
   * Save Indian user location manually
   */
  static async saveIndianUserLocation(userId: string): Promise<void> {
    try {
      const cached = localStorage.getItem(this.LOCAL_STORAGE_KEY(userId));
      if (cached) return; // Already saved, skip

      const location = await LocationService.getUserLocation();
      if (location && LocationService.isIndianUser(location.countryCode)) {
        localStorage.setItem(this.LOCAL_STORAGE_KEY(userId), JSON.stringify(location));
        await LocationService.saveUserLocation(userId, location);
      }
    } catch (error) {
      console.error('Error saving Indian user location:', error);
    }
  }
}
