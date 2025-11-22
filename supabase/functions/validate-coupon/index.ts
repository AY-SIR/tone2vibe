import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
Deno.serve(async (req)=>{
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);
  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(req);
  }
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Server configuration error");
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({
        isValid: false,
        message: "Authentication required"
      }), {
        status: 401,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    const token = authHeader.replace("Bearer ", "").trim();
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData?.user) {
      return new Response(JSON.stringify({
        isValid: false,
        message: "Invalid authentication"
      }), {
        status: 401,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    // Parse request body
    const { code, amount, type } = await req.json();
    if (!code || !amount || !type) {
      return new Response(JSON.stringify({
        isValid: false,
        message: "Missing required parameters"
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    // Validate amount is a positive number
    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return new Response(JSON.stringify({
        isValid: false,
        message: "Invalid amount"
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    // Query coupon from database
    const normalizedCode = code.trim();
    const { data: coupons, error: couponError } = await supabase.from("coupons").select("*").ilike("code", normalizedCode) // case-insensitive
    .eq("active", true).in("type", [
      type,
      "both"
    ]);
    if (couponError) {
      return new Response(JSON.stringify({
        isValid: false,
        message: "Error validating coupon"
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    if (!coupons || coupons.length === 0) {
      return new Response(JSON.stringify({
        isValid: false,
        message: "Invalid or expired coupon code"
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    const coupon = coupons[0];
    // Check if coupon is expired
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      return new Response(JSON.stringify({
        isValid: false,
        message: "This coupon has expired"
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    // Check usage limit
    if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
      return new Response(JSON.stringify({
        isValid: false,
        message: "This coupon has reached its maximum usage limit"
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    // Calculate discount based on the EXACT amount passed in
    let discount = 0;
    let discountType = "fixed";
    // Check which discount field is being used
    if (coupon.discount_percentage && coupon.discount_percentage > 0) {
      // Percentage discount
      discountType = "percentage";
      // ✅ CRITICAL: Use the exact amount and apply consistent rounding
      const percentageDiscount = numericAmount * coupon.discount_percentage / 100;
      discount = Math.ceil(percentageDiscount); // Round up to match frontend
    } else if (coupon.discount_amount && coupon.discount_amount > 0) {
      // Fixed amount discount
      discountType = "fixed";
      discount = coupon.discount_amount;
    }

    // ✅ CRITICAL: Ensure discount never exceeds the amount
    discount = Math.min(discount, numericAmount);

    const finalAmount = Math.max(0, numericAmount - discount);

    // Log for monitoring
    console.log("Coupon validated:", { code, discount, final_amount: finalAmount });

    return new Response(JSON.stringify({
      isValid: true,
      valid: true,
      discount: discount,
      message: `Coupon applied! You save ₹${discount}`,
      type: discountType,
      originalAmount: numericAmount
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    console.error("Validate coupon error:", error);
    return new Response(JSON.stringify({
      isValid: false,
      message: "Error validating coupon. Please try again."
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});
