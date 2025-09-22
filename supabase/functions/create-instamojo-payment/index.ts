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
    const body = await req.json();
    const { amount, purpose, buyer_name, email, redirect_url, type, plan, word_count } = body;

    if (!amount || !purpose || !buyer_name || !email) {
      throw new Error("Missing required fields");
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

    // Create payment request
    const paymentData = new FormData();
    paymentData.append("purpose", purpose);
    paymentData.append("amount", amount.toString());
    paymentData.append("buyer_name", buyer_name);
    paymentData.append("email", email);
    paymentData.append("redirect_url", redirect_url);
    paymentData.append("send_email", "True");
    paymentData.append("allow_repeated_payments", "False");

    const response = await fetch(`${baseUrl}payment-requests/`, {
      method: "POST",
      headers: {
        "X-Api-Key": apiKey,
        "X-Auth-Token": authToken,
      },
      body: paymentData
    });

    const responseData = await response.json();

    if (!response.ok || !responseData.success) {
      throw new Error(responseData.message || "Failed to create payment request");
    }

    // Save order details to database
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const orderData: any = {
      user_id: user.id,
      payment_request_id: responseData.payment_request.id,
      amount: parseInt(amount),
      currency: "INR",
      status: "pending",
      payment_method: "instamojo",
      order_type: type || "subscription",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (plan) orderData.plan = plan;
    if (word_count) orderData.words_purchased = parseInt(word_count);

    const { error: orderError } = await supabaseService.from("orders").insert([orderData]);
    
    if (orderError) {
      console.error("Failed to save order:", orderError);
      throw new Error("Failed to save order details");
    }

    console.log(`Instamojo payment request created: ${responseData.payment_request.id}`);

    return new Response(JSON.stringify({
      success: true,
      payment_request: responseData.payment_request,
      message: "Payment request created successfully"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Instamojo payment creation error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});