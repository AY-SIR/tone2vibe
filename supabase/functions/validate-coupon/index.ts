import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);
  
  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(req);
  }

  try {
    const { code, amount, type } = await req.json();

    if (!code || !amount || !type) {
      return new Response(
        JSON.stringify({ 
          isValid: false, 
          message: "Missing required fields" 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ 
          isValid: false, 
          message: "Authentication required" 
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ 
          isValid: false, 
          message: "Invalid authentication" 
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate coupon
    const { data: coupon, error: couponError } = await supabaseAdmin
      .from("coupons")
      .select("*")
      .eq("code", code.toUpperCase().trim())
      .eq("active", true)
      .single();

    if (couponError || !coupon) {
      return new Response(
        JSON.stringify({ 
          isValid: false, 
          discount: 0,
          message: "Invalid coupon code" 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if coupon is expired
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ 
          isValid: false, 
          discount: 0,
          message: "This coupon has expired" 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if coupon usage limit reached
    if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
      return new Response(
        JSON.stringify({ 
          isValid: false, 
          discount: 0,
          message: "This coupon has reached its usage limit" 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if coupon type matches
    if (coupon.type !== "both" && coupon.type !== type) {
      return new Response(
        JSON.stringify({ 
          isValid: false, 
          discount: 0,
          message: `This coupon is only valid for ${coupon.type} purchases` 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate discount
    let discount = 0;
    let discountType = "fixed";

    if (coupon.discount_percentage > 0) {
      discount = Math.floor((amount * coupon.discount_percentage) / 100);
      discountType = "percentage";
    } else if (coupon.discount_amount > 0) {
      discount = Math.min(coupon.discount_amount, amount);
      discountType = "fixed";
    }

    // Ensure discount doesn't exceed amount
    discount = Math.min(discount, amount);

    return new Response(
      JSON.stringify({
        isValid: true,
        discount,
        type: discountType,
        message: `Coupon applied! You saved ₹${discount}`,
        code: coupon.code
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('Coupon validation error:', error);
    return new Response(
      JSON.stringify({ 
        isValid: false,
        discount: 0,
        message: error instanceof Error ? error.message : "Error validating coupon" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
