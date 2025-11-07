// services/couponService.ts

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
    discount_amount: number | null;
    type: string;
    expires_at: string | null;
    max_uses: number | null;
    used_count: number;
    last_used_at: string | null;
  };
}

export class CouponService {
  /**
   * Validate a coupon code for a given amount and optional type.
   * @param code Coupon code entered by the user
   * @param amount Total amount for which discount is applied
   * @param type Optional type filter: 'subscription', 'words', or 'both'
   */
  static async validateCoupon(
    code: string,
    amount: number,
    type?: "subscription" | "words" | "both"
  ): Promise<CouponValidation> {
    if (!code) {
      return {
        isValid: false,
        discount: 0,
        message: "Please provide a coupon code.",
      };
    }

    try {
      // Use secure database function instead of direct query
      const { data, error } = await supabase.rpc('validate_coupon_secure', {
        p_coupon_code: code.trim()
      });

      if (error) {
        return {
          isValid: false,
          discount: 0,
          message: "Error validating coupon. Please try again.",
        };
      }

      if (!data || data.length === 0) {
        return {
          isValid: false,
          discount: 0,
          message: "Invalid coupon code.",
        };
      }

      const result = data[0];

      if (!result.is_valid) {
        return {
          isValid: false,
          discount: 0,
          message: result.error_message || "Invalid coupon code.",
        };
      }

      // Calculate discount
      let discount = 0;
      if (result.discount_percentage && result.discount_percentage > 0) {
        discount = Math.floor((amount * result.discount_percentage) / 100);
      } else if (result.discount_amount && result.discount_amount > 0) {
        discount = Math.min(amount, Number(result.discount_amount));
      }

      return {
        isValid: true,
        discount,
        code: result.code,
        message: "Coupon applied successfully!",
        coupon: {
          id: result.id,
          code: result.code,
          discount_percentage: result.discount_percentage,
          discount_amount: result.discount_amount,
          type: result.type,
          expires_at: result.expires_at,
          max_uses: result.max_uses,
          used_count: result.used_count,
          last_used_at: null,
        },
      };
    } catch (err) {
      return {
        isValid: false,
        discount: 0,
        message: "Unexpected error occurred. Try again later.",
      };
    }
  }
}
