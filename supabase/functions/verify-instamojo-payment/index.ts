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
    const { payment_id, payment_request_id } = await req.json();
    
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
      throw new Error("Instamojo API credentials not configured");
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
      .eq("payment_request_id", payment_request_id)
      .eq("user_id", user.id)
      .single();

    if (!order) {
      throw new Error("Order not found");
    }

    if (order.status === "paid") {
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
        status: "paid",
        payment_id: payment_id,
        amount: parseFloat(payment.amount),
      })
      .eq("id", order.id);
    
    if (orderUpdateError) {
      console.error("Failed to update order:", orderUpdateError);
      throw new Error("Failed to update order status");
    }

    // Process based on order type
    if (order.order_type === "subscription" && order.plan) {
      // Update user profile for subscription
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
        console.error("Failed to update profile:", profileUpdateError);
    const { error: paymentRecordError } = await supabaseService
      }

    } else if (order.order_type === "word_purchase" && order.word_count) {
      // Add purchased words
      const { error } = await supabaseService.rpc('add_purchased_words', {
        user_id_param: user.id,
        words_to_add: order.word_count,
        payment_id_param: payment_id
      });
    
    if (paymentRecordError) {
      console.error("Failed to record payment:", paymentRecordError);
      // Don't throw error as the main transaction succeeded
    }

      if (error) {
        console.error("Failed to add purchased words:", error);
        throw new Error("Failed to add purchased words");
      }

      // Record word purchase in word_purchases table
      const { error: wordPurchaseError } = await supabaseService
        .from("word_purchases")
        .insert({
          user_id: user.id,
          words_purchased: order.words_purchased || order.word_count,
          amount_paid: parseFloat(payment.amount),
          currency: payment.currency || "INR",
          payment_id: payment_id,
          status: "completed",
          payment_method: "instamojo"
        });
      
      if (wordPurchaseError) {
        console.error("Failed to record word purchase:", wordPurchaseError);
        // Don't throw error as words were already added
      }
    }

    console.log(`Payment verified and processed: ${payment_id}`);

    return new Response(JSON.stringify({
      success: true,
      payment_id: payment_id,
      message: "Payment verified and processed successfully"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Payment verification error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});