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
    const { plan, user_id, coupon_code } = await req.json();

    if (!plan || !user_id) {
      return new Response(
        JSON.stringify({ error: "Plan and user_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // --- Set plan limits ---
    const planLimits: Record<string, { words_limit: number; upload_limit_mb: number }> = {
      free: { words_limit: 1000, upload_limit_mb: 10 },
      pro: { words_limit: 10000, upload_limit_mb: 25 },
      premium: { words_limit: 50000, upload_limit_mb: 100 },
    };

    const limits = planLimits[plan];
    if (!limits) {
      return new Response(
        JSON.stringify({ error: "Invalid plan selected" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let discount = 0;

    // --- Coupon validation ---
    if (coupon_code) {
      const { data: coupon, error: couponError } = await supabaseAdmin
        .from("coupons")
        .select("*")
        .eq("code", coupon_code.toUpperCase())
        .eq("type", "subscription")
        .single();

      if (couponError || !coupon) {
        return new Response(
          JSON.stringify({ error: "Invalid coupon code" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
        return new Response(
          JSON.stringify({ error: "Coupon has expired" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
        return new Response(
          JSON.stringify({ error: "Coupon usage limit exceeded" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Increment used_count
      const { error: couponUpdateError } = await supabaseAdmin
        .from("coupons")
        .update({
          used_count: (coupon.used_count || 0) + 1,
          last_used_at: new Date().toISOString(),
        })
        .eq("id", coupon.id);

      if (couponUpdateError) {
        return new Response(
          JSON.stringify({ error: "Failed to update coupon usage" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      discount = coupon.discount_amount || 0;
    }

    const now = new Date().toISOString();

    // --- Activate Plan ---
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({
        plan,
        words_limit: limits.words_limit,
        word_balance: limits.words_limit,
        plan_words_used: 0,
        upload_limit_mb: limits.upload_limit_mb,
        plan_start_date: now,
        plan_end_date: null, // Optional: set expiry if needed
        updated_at: now,
      })
      .eq("user_id", user_id);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: "Failed to update user profile" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Insert subscription history ---
    const { error: historyError } = await supabaseAdmin
      .from("subscription_history")
      .insert({
        user_id,
        payment_id: `FREE_ACTIVATION_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        amount_paid: 0,
        currency: "INR",
        status: "completed",
        plan,
        coupon_code: coupon_code || null,
        discount,
        activated_at: now,
        created_at: now,
      });

    if (historyError) {
      return new Response(
        JSON.stringify({ error: "Failed to insert subscription history" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `${plan} plan activated!`,
        discount,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
