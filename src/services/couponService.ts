import { supabase } from "@/integrations/supabase/client";

export interface CouponValidation {
  isValid: boolean;
  discount: number;
  message: string;
  code: string;
  discountType?: "percentage" | "fixed";
  originalAmount?: number;
}

export interface Coupon {
  id: string;
  code: string;
  discount_percentage: number;
  discount_amount: number;
  type: "subscription" | "words" | "both";
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  active: boolean;
  max_uses: number | null;
  used_count: number;
  last_used_at: string | null;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export class CouponService {
  /**
   * ✅ Validate coupon using Edge Function
   */
  static async validateCoupon(
    code: string,
    amount: number,
    type: "subscription" | "words"
  ): Promise<CouponValidation> {
    try {
      if (!code || !code.trim()) {
        return {
          isValid: false,
          discount: 0,
          message: "Please enter a coupon code",
          code: "",
        };
      }

      if (amount <= 0) {
        return {
          isValid: false,
          discount: 0,
          message: "Invalid amount",
          code: "",
        };
      }

      const normalizedCode = code.trim();
      console.log("Validating coupon:", normalizedCode, "for type:", type, "amount:", amount);

      // 🔥 Call Edge Function instead of direct Supabase table query
      const response = await fetch(`${SUPABASE_URL}/functions/v1/validate-coupon`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: normalizedCode, amount, type }),
      });

      const result = await response.json();
      console.log("Coupon validation result:", result);

      if (!response.ok) {
        return {
          isValid: false,
          discount: 0,
          message: result.error || "Error validating coupon. Please try again.",
          code: normalizedCode,
        };
      }

      return result;
    } catch (error) {
      console.error("Coupon validation error:", error);
      return {
        isValid: false,
        discount: 0,
        message: "Error validating coupon. Please try again.",
        code: "",
      };
    }
  }

  /**
   * ✅ Increment coupon usage (after successful payment)
   */
  static async incrementCouponUsage(code: string): Promise<boolean> {
    try {
      const normalizedCode = code.trim();
      console.log("Incrementing coupon usage via Edge Function:", normalizedCode);

      const response = await fetch(`${SUPABASE_URL}/functions/v1/increment-coupon-usage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: normalizedCode }),
      });

      const result = await response.json();
      console.log("Increment coupon usage result:", result);

      return result.success === true;
    } catch (error) {
      console.error("Error incrementing coupon usage:", error);
      return false;
    }
  }

  /**
   * 🧩 Get all active coupons (admin use only)
   * Keep this only for backend-admin usage
   */
  static async getActiveCoupons(): Promise<Coupon[]> {
    try {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .eq("active", true)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching coupons:", error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error("Error in getActiveCoupons:", error);
      return [];
    }
  }

  /**
   * 🧩 Admin only: Create coupon
   */
  static async createCoupon(
    couponData: Partial<Coupon>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.from("coupons").insert({
        code: couponData.code?.trim(),
        discount_percentage: couponData.discount_percentage || 0,
        discount_amount: couponData.discount_amount || 0,
        type: couponData.type || "both",
        expires_at: couponData.expires_at || null,
        max_uses: couponData.max_uses || null,
        active: couponData.active ?? true,
      });

      if (error) {
        console.error("Error creating coupon:", error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error("Error in createCoupon:", error);
      return { success: false, error: "Failed to create coupon" };
    }
  }

  /**
   * 🧩 Admin only: Deactivate coupon
   */
  static async deactivateCoupon(code: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("coupons")
        .update({
          active: false,
          updated_at: new Date().toISOString(),
        })
        .eq("code", code.trim());

      if (error) {
        console.error("Error deactivating coupon:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error in deactivateCoupon:", error);
      return false;
    }
  }
}
