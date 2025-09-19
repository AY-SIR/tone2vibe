import { LocationService } from './locationService';

export interface AccessCheck {
  isAllowed: boolean;
  countryCode?: string;
  countryName?: string;
  message: string;
}

export class IndiaOnlyService {

  /**
   * Check if the user is from India
   */
  static async checkIndianAccess(): Promise<AccessCheck> {
    try {
      const location = await LocationService.getUserLocation();

      // If location is missing
      if (!location || !location.countryCode) {
        return {
          isAllowed: false,
          message: 'This service is only available in India.'
        };
      }

      const isIndian = LocationService.isIndianUser(location.countryCode);

      // User is not from India
      if (!isIndian) {
        return {
          isAllowed: false,
          countryCode: location.countryCode,
          countryName: location.country,
          message: `This service is only available in India, not in ${location.country}.`
        };
      }

      // User is from India
      return {
        isAllowed: true,
        countryCode: location.countryCode,
        countryName: location.country,
        message: 'Welcome, Indian user!'
      };

    } catch (error) {
      console.error('India access check failed:', error);
      return {
        isAllowed: false,
        message: 'This service is only available in India.'
      };
    }
  }

  /**
   * Save Indian user location locally and via the LocationService
   */
  static async saveIndianUserLocation(userId: string): Promise<void> {
    try {
      const location = await LocationService.getUserLocation();

      if (location && LocationService.isIndianUser(location.countryCode)) {
        // Save via service
        await LocationService.saveUserLocation(userId, location);

        // Save in localStorage for quick access
        localStorage.setItem(`user_location_${userId}`, JSON.stringify(location));
      }
    } catch (error) {
      console.error('Error saving Indian user location:', error);
    }
  }
}
