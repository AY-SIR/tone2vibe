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
    const { payment_id, payment_request_id, type, plan } = await req.json();
    
    if (!payment_id || !payment_request_id) {
      throw new Error("Payment ID and Payment Request ID are required");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Get authenticated user
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user) throw new Error("User not authenticated");

    // Get Instamojo API credentials
    const apiKey = Deno.env.get("INSTAMOJO_API_KEY");
    const authToken = Deno.env.get("INSTAMOJO_AUTH_TOKEN");
    const testMode = Deno.env.get("INSTAMOJO_TEST_MODE") === "true";

    if (!apiKey || !authToken) {
      throw new Error("Payment gateway not configured");
    }

    const baseUrl = testMode 
      ? "https://test.instamojo.com/api/1.1/" 
      : "https://www.instamojo.com/api/1.1/";

    // Verify payment with Instamojo
    const response = await fetch(`${baseUrl}payments/${payment_id}/`, {
      method: "GET",
      headers: {
        "X-Api-Key": apiKey,
        "X-Auth-Token": authToken,
      }
    });

    const paymentData = await response.json();

    if (!response.ok || !paymentData.success) {
      throw new Error("Failed to verify payment with Instamojo");
    }

    const payment = paymentData.payment;
    if (payment.status !== "Credit") {
      throw new Error("Payment not completed");
    }

    // Use service role to update order and profile
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get order details
    const { data: order } = await supabaseService
      .from("orders")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!order) {
      throw new Error("Order not found");
    }

    // Check if already processed
    if (order.status === "completed") {
      return new Response(JSON.stringify({
        success: true,
        message: "Payment already processed",
        already_processed: true
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Update order status
    const { error: orderUpdateError } = await supabaseService
      .from("orders")
      .update({
        status: "completed",
        updated_at: new Date().toISOString()
      })
      .eq("id", order.id);
    
    if (orderUpdateError) {
      throw new Error("Failed to update order status");
    }

    // Process based on order type
    if (order.plan) {
      // Subscription payment
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + 1);

      const wordsLimit = order.plan === 'pro' ? 10000 : 50000;
      const uploadLimit = order.plan === 'pro' ? 25 : 100;

      const { error: profileUpdateError } = await supabaseService
        .from("profiles")
        .update({
          plan: order.plan,
          plan_expires_at: expiryDate.toISOString(),
          plan_start_date: new Date().toISOString(),
          plan_end_date: expiryDate.toISOString(),
          words_limit: wordsLimit,
          upload_limit_mb: uploadLimit,
          plan_words_used: 0,
          updated_at: new Date().toISOString()
        })
        .eq("user_id", user.id);

      if (profileUpdateError) {
        throw new Error("Failed to update subscription");
      }

      // Record payment
      const { error: paymentRecordError } = await supabaseService
        .from("payments")
        .insert({
          user_id: user.id,
          payment_id: payment_id,
          amount: parseFloat(payment.amount),
          currency: payment.currency || "INR",
          status: "completed",
          plan: order.plan,
          created_at: new Date().toISOString()
        });

      if (paymentRecordError) {
        console.warn("Payment recorded but history update failed");
      }

    } else if (order.words_purchased) {
      // Word purchase payment
      const { error } = await supabaseService.rpc('add_purchased_words', {
        user_id_param: user.id,
        words_to_add: order.words_purchased,
        payment_id_param: payment_id
      });

      if (error) {
        throw new Error("Failed to add purchased words");
      }

      // Record word purchase
      const { error: wordPurchaseError } = await supabaseService
        .from("word_purchases")
        .insert({
          user_id: user.id,
          words_purchased: order.words_purchased,
          amount_paid: parseFloat(payment.amount),
          currency: payment.currency || "INR",
          payment_id: payment_id,
          status: "completed",
          payment_method: "instamojo",
          created_at: new Date().toISOString()
        });
      
      if (wordPurchaseError) {
        console.warn("Words added but history update failed");
      }
    }

    return new Response(JSON.stringify({
      success: true,
      payment_id: payment_id,
      message: "Payment verified and processed successfully"
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