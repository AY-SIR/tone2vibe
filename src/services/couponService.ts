// Simplified coupon service - tables will be created later
export interface CouponValidation {
  isValid: boolean;
  discount: number;
  message: string;
}

export class CouponService {
  // Simple placeholder for now - will be expanded when database tables are created
  static async validateCoupon(
    couponCode: string, 
    amount: number, 
    type: 'subscription' | 'words'
  ): Promise<CouponValidation> {
    // Hardcoded coupons for now - replace with database later
    const coupons: Record<string, { discount: number; type: string }> = {
      'SAVE10': { discount: 10, type: 'both' },
      'WELCOME20': { discount: 20, type: 'subscription' },
      'WORDS15': { discount: 15, type: 'words' }
    };

    const coupon = coupons[couponCode.toUpperCase()];
    
    if (!coupon) {
      return {
        isValid: false,
        discount: 0,
        message: 'Invalid coupon code'
      };
    }

    if (coupon.type !== 'both' && coupon.type !== type) {
      return {
        isValid: false,
        discount: 0,
        message: `This coupon is not applicable to ${type} purchases`
      };
    }

    const discount = Math.round((amount * coupon.discount) / 100);

    return {
      isValid: true,
      discount,
      message: `Coupon applied! You save ₹${discount} (${coupon.discount}% off)`
    };
  }
}