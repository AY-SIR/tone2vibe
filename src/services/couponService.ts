// services/couponService.ts
import { supabase } from "@/integrations/supabase/client";

export interface CouponValidation {
  isValid: boolean;
  discount: number;
  code?: string;
  type?: string;
  reason?: string;
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
  static async validateCoupon(code: string, amount: number): Promise<CouponValidation> {
    if (!code) {
      return { isValid: false, discount: 0, reason: "No code provided" };
    }

    const { data, error } = await supabase
      .from("coupons")
      .select("*")
      .eq("code", code.toUpperCase()) // normalize to uppercase
      .maybeSingle();

    if (error) {
      console.error("Error fetching coupon:", error);
      return { isValid: false, discount: 0, reason: "Error checking coupon" };
    }

    if (!data) {
      return { isValid: false, discount: 0, reason: "Invalid code" };
    }

    // Check validity
    if (!data.active) {
      return { isValid: false, discount: 0, reason: "Coupon is inactive" };
    }

    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return { isValid: false, discount: 0, reason: "Coupon expired" };
    }

    if (data.max_uses && data.used_count >= data.max_uses) {
      return { isValid: false, discount: 0, reason: "Coupon usage limit reached" };
    }

    // Calculate discount
    let discount = 0;
    if (data.discount_percentage && data.discount_percentage > 0) {
      discount = Math.floor((amount * data.discount_percentage) / 100);
    } else if (data.discount_amount && data.discount_amount > 0) {
      discount = Math.min(amount, Number(data.discount_amount));
    }

    return {
      isValid: true,
      discount,
      code: data.code,
      type: data.type,
      coupon: {
        id: data.id,
        code: data.code,
        discount_percentage: data.discount_percentage,
        discount_amount: data.discount_amount,
        type: data.type,
        expires_at: data.expires_at,
        max_uses: data.max_uses,
        used_count: data.used_count,
        last_used_at: data.last_used_at,
      },
    };
  }
}
