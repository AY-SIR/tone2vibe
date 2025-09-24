// services/couponService.ts

import { supabase } from "@/integrations/supabase/client";

export interface CouponValidation {
  isValid: boolean;
  discount: number;
  message: string; // Changed from reason/type to a single 'message' for the UI
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
  // The 'type' parameter from your component wasn't used, I've removed it for now.
  // Add it back if you need to filter coupons by type (e.g., 'subscription' or 'words').
  static async validateCoupon(code: string, amount: number): Promise<CouponValidation> {
    if (!code) {
      return { isValid: false, discount: 0, message: "Please provide a coupon code." };
    }

    // --- CHANGE IS HERE ---
    // Removed .toUpperCase() to enforce a case-sensitive match.
    const { data, error } = await supabase
      .from("coupons")
      .select("*")
      .eq("code", code) // Now it looks for an exact match
      .maybeSingle();

    if (error) {
      console.error("Error fetching coupon:", error);
      return { isValid: false, discount: 0, message: "Error validating coupon. Please try again." };
    }

    if (!data) {
      // This will now correctly trigger for 'savebig' if the coupon is 'SAVEBIG'
      return { isValid: false, discount: 0, message: "Invalid coupon code." };
    }

    // Check validity with user-friendly messages
    if (!data.active) {
      return { isValid: false, discount: 0, message: "This coupon is no longer active." };
    }

    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return { isValid: false, discount: 0, message: "This coupon has expired." };
    }

    if (data.max_uses && data.used_count >= data.max_uses) {
      return { isValid: false, discount: 0, message: "This coupon has reached its usage limit." };
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
      message: "Coupon applied successfully!", // Added a success message for the UI
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
