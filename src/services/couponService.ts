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
    max_uses?: number;
    used_count?: number;
  };
}

export class CouponService {
  static async validateCoupon(
    couponCode: string,
    amount: number,
    type: 'subscription' | 'words'
  ): Promise<CouponValidation> {
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', couponCode.toUpperCase())
        .single();

      if (error || !data) {
        return { 
          isValid: false, 
          discount: 0, 
          message: 'Invalid coupon code', 
          code: couponCode 
        };
      }

      // Check if coupon type matches
      if (data.type !== 'both' && data.type !== type) {
        return {
          isValid: false,
          discount: 0,
          message: `This coupon is not applicable to ${type} purchases`,
          code: couponCode
        };
      }

      // Check expiry
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        return { 
          isValid: false, 
          discount: 0, 
          message: 'Coupon has expired', 
          code: couponCode 
        };
      }

      // Check usage limits
      if (data.max_uses && data.used_count >= data.max_uses) {
        return {
          isValid: false,
          discount: 0,
          message: 'Coupon usage limit exceeded',
          code: couponCode
        };
      }

      // Calculate discount
      let discount = 0;
      if (data.discount_percentage > 0) {
        discount = Math.round((amount * data.discount_percentage) / 100);
      } else if (data.discount_amount > 0) {
        discount = Math.min(data.discount_amount, amount);
      }

      // Ensure discount doesn't exceed amount
      discount = Math.min(discount, amount);

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
          expires_at: data.expires_at,
          max_uses: data.max_uses,
          used_count: data.used_count
        }
      };
    } catch (error) {
      return {
        isValid: false,
        discount: 0,
        message: 'Error validating coupon. Please try again.',
        code: couponCode
      };
    }
  }

  static async applyCoupon(couponId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('coupons')
        .update({
          used_count: supabase.sql`used_count + 1`,
          last_used_at: new Date().toISOString()
        })
        .eq('id', couponId);

      return !error;
    } catch (error) {
      return false;
    }
  }
}