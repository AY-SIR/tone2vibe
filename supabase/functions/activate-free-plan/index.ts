import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { plan, coupon_code, user_id } = await req.json();

    if (!plan || !user_id) {
      throw new Error("Plan and user_id are required");
    }

    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Validate coupon if provided
    if (coupon_code) {
      const { data: coupon, error: couponError } = await supabaseService
        .from('coupons')
        .select('*')
        .eq('code', coupon_code.toUpperCase())
        .single();

      if (couponError || !coupon) {
        throw new Error("Invalid coupon code");
      }

      if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
        throw new Error("Coupon has expired");
      }

      if (coupon.type !== 'subscription' && coupon.type !== 'both') {
        throw new Error("Coupon not applicable to subscriptions");
      }

      // Check if coupon provides 100% discount
      if (coupon.discount_percentage !== 100) {
        throw new Error("Coupon does not provide free activation");
      }
    }

    // Activate plan for free
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + 1);

    const wordsLimit = plan === 'pro' ? 10000 : 50000;

    const { error: updateError } = await supabaseService
      .from("profiles")
      .update({
        plan: plan,
        plan_expires_at: expiryDate.toISOString(),
        words_limit: wordsLimit,
        plan_words_used: 0,
        updated_at: new Date().toISOString()
      })
      .eq("user_id", user_id);

    if (updateError) {
      throw new Error("Failed to activate plan");
    }

    // Record the free activation
    await supabaseService.from("payments").insert({
      user_id: user_id,
      payment_id: `FREE_${Date.now()}_${coupon_code || 'ACTIVATION'}`,
      amount: 0,
      currency: "INR",
      status: "completed",
      plan: plan
    });

    return new Response(JSON.stringify({
      success: true,
      message: `${plan} plan activated successfully with coupon`,
      expires_at: expiryDate.toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});