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

  // Helper for structured failure responses
  const fail = (message: string, status = 400) =>
    new Response(JSON.stringify({ success: false, message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status,
    });

  try {
    const { payment_id, payment_request_id } = await req.json();
    if (!payment_id || !payment_request_id) return fail("Payment ID and Request ID required");

    // Get Instamojo credentials
    const apiKey = Deno.env.get("INSTAMOJO_API_KEY");
    const authToken = Deno.env.get("INSTAMOJO_AUTH_TOKEN");
    const testMode = Deno.env.get("INSTAMOJO_TEST_MODE") === "true";
    if (!apiKey || !authToken) return fail("Payment gateway not configured");

    // Get authenticated user from JWT (validated by Supabase)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return fail("Missing authorization header", 401);

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) return fail("User not authenticated", 401);

    // Verify payment with Instamojo
    const baseUrl = testMode
      ? "https://test.instamojo.com/api/1.1/"
      : "https://www.instamojo.com/api/1.1/";

    const verifyRes = await fetch(`${baseUrl}payments/${payment_id}/`, {
      headers: { "X-Api-Key": apiKey, "X-Auth-Token": authToken },
    });
    const verifyData = await verifyRes.json();

    if (!verifyRes.ok || !verifyData.success)
      return fail("Failed to verify payment with Instamojo");

    const payment = verifyData.payment;
    if (!payment || payment.status !== "Credit") return fail("Payment not completed or failed");

    // Service role client
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Fetch latest pending order
    const { data: order, error: orderErr } = await supabaseService
      .from("orders")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .eq('payment_request_id', payment_request_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (orderErr || !order) return fail("No pending order found");

    // If already processed
    if (order.status === "completed") {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Payment already processed",
          already_processed: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Mark order as completed
    const { error: updateErr } = await supabaseService
      .from("orders")
      .update({ status: "completed", updated_at: new Date().toISOString() })
      .eq("id", order.id);
    if (updateErr) return fail("Failed to update order status");

    // 🧩 Process payment type
    if (order.plan) {
      // Subscription
      const expiry = new Date();
      expiry.setMonth(expiry.getMonth() + 1);

      const limits =
        order.plan === "pro"
          ? { words: 10000, upload: 25 }
          : { words: 50000, upload: 100 };

      const { error: profileErr } = await supabaseService
        .from("profiles")
        .update({
          plan: order.plan,
          plan_start_date: new Date().toISOString(),
          plan_end_date: expiry.toISOString(),
          plan_expires_at: expiry.toISOString(),
          words_limit: limits.words,
          upload_limit_mb: limits.upload,
          plan_words_used: 0,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (profileErr) return fail("Failed to update user subscription");

      const { error: payRecordErr } = await supabaseService.from("payments").insert([
        {
          user_id: user.id,
          payment_id,
          amount: parseFloat(payment.amount),
          currency: payment.currency || "INR",
          status: "completed",
          plan: order.plan,
          coupon_code: order.coupon_code || null,
          created_at: new Date().toISOString(),
        },
      ]);

      if (payRecordErr)
        console.warn("Subscription activated, but payment record insert failed:", payRecordErr);
    }

    if (order.words_purchased) {
      // Word purchase
      const { error: addErr } = await supabaseService.rpc("add_purchased_words", {
        user_id_param: user.id,
        words_to_add: order.words_purchased,
        payment_id_param: payment_id,
      });

      if (addErr) return fail("Failed to add purchased words");

      const { error: recordErr } = await supabaseService.from("word_purchases").insert([
        {
          user_id: user.id,
          words_purchased: order.words_purchased,
          amount_paid: parseFloat(payment.amount),
          currency: payment.currency || "INR",
          payment_id,
          status: "completed",
          payment_method: "instamojo",
          // store coupon if any within purchase extra info
          created_at: new Date().toISOString(),
        },
      ]);
    // If order had a coupon, increment coupon usage and last_used_at
    if (order.coupon_code) {
      const { data: coupon } = await supabaseService
        .from('coupons')
        .select('id, used_count')
        .eq('code', order.coupon_code)
        .single();
      if (coupon) {
        await supabaseService
          .from('coupons')
          .update({ used_count: (coupon.used_count || 0) + 1, last_used_at: new Date().toISOString() })
          .eq('id', coupon.id);
      }
    }


      if (recordErr)
        console.warn("Words added, but word purchase record insert failed:", recordErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        payment_id,
        message: "Payment verified and processed successfully",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err) {
    console.error("Fatal error verifying payment:", err);
    return new Response(
      JSON.stringify({
        success: false,
        message: err?.message || "Unknown server error",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
