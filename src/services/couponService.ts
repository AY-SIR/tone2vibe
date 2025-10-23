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
    type?: 'subscription' | 'words' | 'both'
  ): Promise<CouponValidation> {
    if (!code) {
      return { isValid: false, discount: 0, message: "Please provide a coupon code." };
    }

    try {
      // Fetch coupon with case-insensitive match
      let query = supabase
        .from("coupons")
        .select("*")
        .ilike("code", code) // case-insensitive
        .maybeSingle();

      // Apply type filter if provided
      if (type) {
        query = supabase
          .from("coupons")
          .select("*")
          .ilike("code", code)
          .eq("type", type)
          .maybeSingle();
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching coupon:", error);
        return { isValid: false, discount: 0, message: "Error validating coupon. Please try again." };
      }

      if (!data) {
        return { isValid: false, discount: 0, message: "Invalid coupon code." };
      }

      const coupon = data as any;

      // Check if coupon is active
      if (!coupon.active) {
        return { isValid: false, discount: 0, message: "This coupon is no longer active." };
      }

      // Check expiration
      if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
        return { isValid: false, discount: 0, message: "This coupon has expired." };
      }

      // Check max uses
      if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
        return { isValid: false, discount: 0, message: "This coupon has reached its usage limit." };
      }

      // Calculate discount
      let discount = 0;
      if (coupon.discount_percentage && coupon.discount_percentage > 0) {
        discount = Math.floor((amount * coupon.discount_percentage) / 100);
      } else if (coupon.discount_amount && coupon.discount_amount > 0) {
        discount = Math.min(amount, Number(coupon.discount_amount));
      }

      return {
        isValid: true,
        discount,
        code: coupon.code,
        message: "Coupon applied successfully!",
        coupon: {
          id: coupon.id,
          code: coupon.code,
          discount_percentage: coupon.discount_percentage,
          discount_amount: coupon.discount_amount,
          type: coupon.type,
          expires_at: coupon.expires_at,
          max_uses: coupon.max_uses,
          used_count: coupon.used_count,
          last_used_at: coupon.last_used_at,
        },
      };
    } catch (err: any) {
      console.error("Unexpected error in validateCoupon:", err);
      return { isValid: false, discount: 0, message: "Unexpected error occurred. Try again later." };
    }
  }
}
