import { LocationService } from './locationService';

export class PaymentLocationService {
  
  // Verify user's country matches the payment location
  static async verifyPaymentLocation(userId: string): Promise<{
    isValid: boolean;
    userCountry: string | null;
    paymentCountry: string | null;
    message: string;
  }> {
    try {
      // Get saved user country from localStorage
      const savedLocation = localStorage.getItem(`user_location_${userId}`);
      let userCountry = null;
      
      if (savedLocation) {
        const locationData = JSON.parse(savedLocation);
        userCountry = locationData.country;
      }
      
      // Get current IP location for payment verification
      const currentLocation = await LocationService.getUserLocation();
      const paymentCountry = currentLocation?.country || null;
      
      console.log('Payment location verification:', {
        userCountry,
        paymentCountry,
        match: userCountry === paymentCountry
      });
      
      // If both are available, check if they match
      if (userCountry && paymentCountry) {
        const isValid = userCountry === paymentCountry;
        
        if (!isValid) {
          return {
            isValid: false,
            userCountry,
            paymentCountry,
            message: `Security Notice: Your payment location (${paymentCountry}) differs from your login location (${userCountry}). Please verify this is intentional.`
          };
        }
        
        return {
          isValid: true,
          userCountry,
          paymentCountry,
          message: 'Payment location verified successfully.'
        };
      }
      
      // If we don't have enough data, allow payment but warn
      return {
        isValid: true,
        userCountry,
        paymentCountry,
        message: 'Payment location could not be fully verified, but proceeding.'
      };
      
    } catch (error) {
      console.error('Payment location verification error:', error);
      return {
        isValid: true, // Allow payment on verification error
        userCountry: null,
        paymentCountry: null,
        message: 'Payment location verification failed, but proceeding.'
      };
    }
  }
  
  // Get user's currency based on saved location
  static getUserCurrency(userId: string): string {
    try {
      const savedLocation = localStorage.getItem(`user_location_${userId}`);
      if (savedLocation) {
        const locationData = JSON.parse(savedLocation);
        return locationData.currency || 'USD';
      }
      return 'USD';
    } catch (error) {
      console.error('Error getting user currency:', error);
      return 'USD';
    }
  }
  
  // Get pricing based on user's saved location
  static getUserPricing(userId: string) {
    const currency = this.getUserCurrency(userId);
    return LocationService.getPricing(currency);
  }
}