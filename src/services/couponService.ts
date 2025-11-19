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

// ✅ Fixed Supabase URL (safe to expose)
const SUPABASE_URL = "https://msbmyiqhohtjdfbjmxlf.supabase.co";

export class CouponService {
  /**
   * ✅ Validate coupon using secure Supabase Edge Function
   */
  static async validateCoupon(
    code: string,
    amount: number,
    type: "subscription" | "words"
  ): Promise<CouponValidation> {
    try {
      if (!code?.trim()) {
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

      // 🔐 Get current user session and refresh if needed
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        // Try to refresh the session
        const { data: { session: refreshedSession } } = await supabase.auth.refreshSession();
        
        if (!refreshedSession?.access_token) {
          return {
            isValid: false,
            discount: 0,
            message: "Please log in to use a coupon",
            code: normalizedCode,
          };
        }
        
        // Use refreshed session
        return await this._validateWithToken(normalizedCode, amount, type, refreshedSession.access_token);
      }

      return await this._validateWithToken(normalizedCode, amount, type, session.access_token);
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
   * Internal helper to validate with token
   */
  private static async _validateWithToken(
    code: string,
    amount: number,
    type: "subscription" | "words",
    accessToken: string
  ): Promise<CouponValidation> {
    try {
      // 🚀 Call Edge Function securely
      const response = await fetch(`${SUPABASE_URL}/functions/v1/validate-coupon`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          code: code,
          amount,
          type,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          isValid: false,
          discount: 0,
          message: result.message || "Error validating coupon. Please try again.",
          code: code,
        };
      }

      // ✅ SAFER FIX — interpret `valid` or `isValid` properly
      const isValid =
        typeof result.isValid === "boolean"
          ? result.isValid
          : typeof result.valid === "boolean"
          ? result.valid
          : false;

      return {
        isValid,
        discount: result.discount ?? 0,
        message:
          result.message ||
          (isValid
            ? "Coupon applied successfully"
            : "Invalid or inapplicable coupon."),
        code: code,
        discountType:
          result.type === "percentage" ? "percentage" : "fixed",
        originalAmount: amount,
      };
    } catch (error) {
      console.error("Token validation error:", error);
      return {
        isValid: false,
        discount: 0,
        message: "Error validating coupon. Please try again.",
        code: "",
      };
    }
  }

  /**
   * ✅ Increment coupon usage after successful payment
   */
  static async incrementCouponUsage(code: string): Promise<boolean> {
    try {
      const normalizedCode = code.trim();

      // Get session and refresh if needed
      let { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        const { data: { session: refreshedSession } } = await supabase.auth.refreshSession();
        session = refreshedSession;
      }
      
      if (!session?.access_token) return false;

      const response = await fetch(`${SUPABASE_URL}/functions/v1/increment-coupon-usage`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ code: normalizedCode }),
      });

      const result = await response.json();
      return response.ok && result.success === true;
    } catch (error) {
      console.error("Increment coupon error:", error);
      return false;
    }
  }

  /**
   * 🧩 Get all active coupons (admin use only)
   */
  static async getActiveCoupons(): Promise<Coupon[]> {
    try {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .eq("active", true)
        .order("created_at", { ascending: false});

      if (error) return [];
      return (data || []) as Coupon[];
    } catch {
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

      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch {
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

      if (error) return false;
      return true;
    } catch {
      return false;
    }
  }
}
