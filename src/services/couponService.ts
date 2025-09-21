import { supabase } from "@/integrations/supabase/client";

export interface CouponValidation {
  isValid: boolean;
  discount: number;
  message: string;
  code?: string;
  coupon?: {
    id: string;
    code: string;
    discount_percentage: number;
    discount_amount: number;
    expires_at?: string;
  };
}

export class CouponService {
  static async validateCoupon(
    couponCode: string,
    amount: number,
    type: 'subscription' | 'words'
  ): Promise<CouponValidation> {
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', couponCode.toUpperCase())
      .single();

    if (error || !data) {
      return { isValid: false, discount: 0, message: 'Invalid coupon code', code: couponCode };
    }

    if (data.type !== 'both' && data.type !== type) {
      return {
        isValid: false,
        discount: 0,
        message: `This coupon is not applicable to ${type} purchases`,
        code: couponCode
      };
    }

    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return { isValid: false, discount: 0, message: 'Coupon has expired', code: couponCode };
    }

    const discount = Math.round((amount * data.discount_percentage) / 100);

    return {
      isValid: true,
      discount,
      message: `Coupon applied! You save ₹${discount} (${data.discount_percentage}% off)`,
      code: couponCode,
      coupon: {
        id: data.id,
        code: data.code,
        discount_percentage: data.discount_percentage,
        discount_amount: discount,
        expires_at: data.expires_at
      }
    };
  }
}
