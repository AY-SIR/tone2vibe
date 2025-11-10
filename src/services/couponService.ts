// services/couponService.ts
import { supabase } from "@/integrations/supabase/client";

export interface CouponValidation {
  isValid: boolean;
  discount: number;
  message: string;
  code: string;
  discountType?: 'percentage' | 'fixed';
  originalAmount?: number;
}

export interface Coupon {
  id: string;
  code: string;
  discount_percentage: number;
  discount_amount: number;
  type: 'subscription' | 'words' | 'both';
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  active: boolean;
  max_uses: number | null;
  used_count: number;
  last_used_at: string | null;
}

export class CouponService {
  /**
   * Validate and calculate discount for a coupon
   */
  static async validateCoupon(
    code: string,
    amount: number,
    type: 'subscription' | 'words'
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

      const normalizedCode = code.trim().toUpperCase();

      // Fetch coupon from database
      const { data: coupon, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', normalizedCode)
        .single();

      if (error || !coupon) {
        return {
          isValid: false,
          discount: 0,
          message: "Invalid coupon code",
          code: normalizedCode,
        };
      }

      // Type check
      if (coupon.type !== type && coupon.type !== 'both') {
        return {
          isValid: false,
          discount: 0,
          message: `This coupon is only valid for ${coupon.type} purchases`,
          code: normalizedCode,
        };
      }

      // Active check
      if (!coupon.active) {
        return {
          isValid: false,
          discount: 0,
          message: "This coupon is no longer active",
          code: normalizedCode,
        };
      }

      // Expiry check
      if (coupon.expires_at) {
        const expiryDate = new Date(coupon.expires_at);
        const now = new Date();
        if (now > expiryDate) {
          return {
            isValid: false,
            discount: 0,
            message: "This coupon has expired",
            code: normalizedCode,
          };
        }
      }

      // Usage limit check
      if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) {
        return {
          isValid: false,
          discount: 0,
          message: "This coupon has reached its usage limit",
          code: normalizedCode,
        };
      }

      // Calculate discount
      let discount = 0;
      let discountType: 'percentage' | 'fixed' = 'percentage';

      if (coupon.discount_percentage > 0) {
        discount = Math.floor((amount * coupon.discount_percentage) / 100);
        discountType = 'percentage';
      } else if (coupon.discount_amount > 0) {
        discount = Math.min(Number(coupon.discount_amount), amount);
        discountType = 'fixed';
      }

      // Ensure discount doesn't exceed amount
      discount = Math.min(discount, amount);

      return {
        isValid: true,
        discount,
        message: `Coupon applied! You saved ₹${discount}`,
        code: normalizedCode,
        discountType,
        originalAmount: amount,
      };

    } catch (error) {
      console.error('Coupon validation error:', error);
      return {
        isValid: false,
        discount: 0,
        message: "Error validating coupon. Please try again.",
        code: "",
      };
    }
  }

  /**
   * Increment coupon usage count after successful purchase
   */
  static async incrementCouponUsage(code: string): Promise<boolean> {
    try {
      const normalizedCode = code.trim().toUpperCase();

      // Get current coupon data
      const { data: coupon, error: fetchError } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', normalizedCode)
        .single();

      if (fetchError || !coupon) {
        console.error('Coupon not found:', fetchError);
        return false;
      }

      // Update usage count
      const { error: updateError } = await supabase
        .from('coupons')
        .update({
          used_count: coupon.used_count + 1,
          last_used_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('code', normalizedCode);

      if (updateError) {
        console.error('Error updating coupon usage:', updateError);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error incrementing coupon usage:', error);
      return false;
    }
  }

  /**
   * Get all active coupons (admin only)
   */
  static async getActiveCoupons(): Promise<Coupon[]> {
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching coupons:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getActiveCoupons:', error);
      return [];
    }
  }

  /**
   * Create a new coupon (admin only)
   */
  static async createCoupon(couponData: Partial<Coupon>): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('coupons')
        .insert({
          code: couponData.code?.trim().toUpperCase(),
          discount_percentage: couponData.discount_percentage || 0,
          discount_amount: couponData.discount_amount || 0,
          type: couponData.type || 'both',
          expires_at: couponData.expires_at || null,
          max_uses: couponData.max_uses || null,
          active: couponData.active ?? true,
        });

      if (error) {
        console.error('Error creating coupon:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error in createCoupon:', error);
      return { success: false, error: 'Failed to create coupon' };
    }
  }

  /**
   * Deactivate a coupon (admin only)
   */
  static async deactivateCoupon(code: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('coupons')
        .update({
          active: false,
          updated_at: new Date().toISOString()
        })
        .eq('code', code.trim().toUpperCase());

      if (error) {
        console.error('Error deactivating coupon:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in deactivateCoupon:', error);
      return false;
    }
  }
}