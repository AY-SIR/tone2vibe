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

  const fail = (message: string, status = 400) =>
    new Response(JSON.stringify({ success: false, message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status,
    });

  try {
    const body = await req.json();
    const { amount, purpose, buyer_name, email, redirect_url, type, plan, word_count, coupon_code } = body;

    if (!amount || !purpose || !buyer_name || !email) {
      return fail("Missing required fields");
    }

    // Authenticate user
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !userData.user) return fail("User not authenticated");

    const user = userData.user;

    // Initialize vars
    let finalAmount = amount;
    let couponData: any = null;

    // Coupon check
    try {
      if (coupon_code) {
        const service = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
          { auth: { persistSession: false } }
        );

        const { data: coupon, error: couponError } = await service
          .from("coupons")
          .select("*")
          .eq("code", coupon_code.toUpperCase())
          .single();

        if (!couponError && coupon) {
          const valid =
            (!coupon.expires_at || new Date(coupon.expires_at) > new Date()) &&
            (!coupon.max_uses || coupon.used_count < coupon.max_uses) &&
            (coupon.type === "both" || coupon.type === type);

          if (valid) {
            const discount = Math.round((amount * coupon.discount_percentage) / 100);
            finalAmount = Math.max(0, amount - discount);
            couponData = coupon;
          }
        }
      }
    } catch (e) {
      console.error("Coupon check failed:", e);
    }

    // Auto-apply first-transaction coupon for subscriptions if none provided
    try {
      if (!couponData && type === 'subscription') {
        const service = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
          { auth: { persistSession: false } }
        );
        const { data: existingPayments } = await service
          .from('payments')
          .select('id')
          .eq('user_id', user.id)
          .limit(1);
        if (!existingPayments || existingPayments.length === 0) {
          const { data: coupon } = await service
            .from('coupons')
            .select('*')
            .eq('code', 'AST2VPYRRy10')
            .single();
          if (coupon && coupon.active && (!coupon.expires_at || new Date(coupon.expires_at) > new Date())) {
            const discount = Math.round((amount * coupon.discount_percentage) / 100);
            finalAmount = Math.max(0, amount - discount);
            couponData = coupon;
          }
        }
      }
    } catch (e) {
      console.error('First-transaction coupon check failed:', e);
    }

    if (finalAmount === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          free_activation: true,
          coupon_applied: couponData?.code,
          message: "Free activation - no payment required",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Payment gateway setup
    const apiKey = Deno.env.get("INSTAMOJO_API_KEY");
    const authToken = Deno.env.get("INSTAMOJO_AUTH_TOKEN");
    const testMode = Deno.env.get("INSTAMOJO_TEST_MODE") === "true";
    if (!apiKey || !authToken) return fail("Payment gateway not configured");

    const baseUrl = testMode
      ? "https://test.instamojo.com/api/1.1/"
      : "https://www.instamojo.com/api/1.1/";

    // Create payment
    const paymentData = new FormData();
    paymentData.append("purpose", purpose);
    paymentData.append("amount", finalAmount.toString());
    paymentData.append("buyer_name", buyer_name);
    paymentData.append("email", email);
    paymentData.append("redirect_url", redirect_url);
    paymentData.append("send_email", "True");
    paymentData.append("allow_repeated_payments", "False");

    const response = await fetch(`${baseUrl}payment-requests/`, {
      method: "POST",
      headers: { "X-Api-Key": apiKey, "X-Auth-Token": authToken },
      body: paymentData,
    });

    const data = await response.json();
    if (!data.success) return fail(data.message || "Failed to create payment request");

    // Save order
    const service = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );
    const order = {
      user_id: user.id,
      amount: finalAmount,
      currency: "INR",
      status: "pending",
      plan,
      words_purchased: word_count ? parseInt(word_count) : null,
      coupon_code: couponData?.code || null,
      payment_request_id: data?.payment_request?.id || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error: orderError } = await service.from("orders").insert([order]);
    if (orderError) return fail("Failed to save order details");

    return new Response(
      JSON.stringify({
        success: true,
        payment_request: data.payment_request,
        final_amount: finalAmount,
        coupon_applied: couponData?.code,
        message: "Payment request created successfully",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Fatal error:", error);
    return new Response(
      JSON.stringify({ success: false, message: error.message || "Unknown server error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
