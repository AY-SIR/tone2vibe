import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { generateInvoiceHTML } from "./helpers.ts";

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(req);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET");

    if (!razorpayKeySecret) {
      throw new Error("Razorpay secret not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = await req.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      throw new Error("Missing required fields");
    }

    // Verify signature
    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const encoder = new TextEncoder();
    const keyData = encoder.encode(razorpayKeySecret);
    const message = encoder.encode(text);
    
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    
    const signature = await crypto.subtle.sign("HMAC", cryptoKey, message);
    const expectedSignature = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    if (expectedSignature !== razorpay_signature) {
      throw new Error("Invalid payment signature");
    }

    // Fetch payment details from Razorpay
    const { data: payment } = await supabase
      .from("payments")
      .select("*")
      .eq("payment_id", razorpay_order_id)
      .eq("user_id", user.id)
      .single();

    if (!payment) {
      throw new Error("Payment record not found");
    }

    // Update payment status
    const { error: updateError } = await supabase
      .from("payments")
      .update({
        status: "completed",
        payment_id: razorpay_payment_id
      })
      .eq("payment_id", razorpay_order_id)
      .eq("user_id", user.id);

    if (updateError) throw updateError;

    // Handle subscription or word purchase
    let wordsPurchased = null;
    
    if (payment.plan) {
      // Subscription - update user profile
      const planLimits = {
        pro: { words_limit: 10000, upload_limit_mb: 25 },
        premium: { words_limit: 50000, upload_limit_mb: 100 }
      };

      const limits = planLimits[payment.plan as 'pro' | 'premium'];
      
      await supabase.rpc('safe_update_profile_for_subscription', {
        p_user_id: user.id,
        p_plan: payment.plan,
        p_words_limit: limits.words_limit,
        p_word_balance: 0,
        p_plan_words_used: 0,
        p_upload_limit_mb: limits.upload_limit_mb,
        p_plan_start_date: new Date().toISOString(),
        p_plan_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        p_last_payment_amount: payment.amount,
        p_last_payment_id: razorpay_payment_id,
        p_last_payment_method: 'razorpay'
      });
    } else {
      // Word purchase - calculate based on user plan pricing
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('plan')
        .eq('user_id', user.id)
        .single();
      
      const pricePerThousand = userProfile?.plan === 'premium' ? 9 : 11;
      const wordCount = Math.floor((payment.amount / 100) / pricePerThousand * 1000);
      wordsPurchased = wordCount;
      
      await supabase.rpc('add_purchased_words', {
        user_id_param: user.id,
        words_to_add: wordCount,
        payment_id_param: razorpay_payment_id
      });
    }

    // Generate and store invoice
    const invoiceNumber = `INV-${Date.now()}-${user.id.substring(0, 8)}`;
    
    // Get user profile for invoice details
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('user_id', user.id)
      .single();
    
    // Generate invoice HTML
    const invoiceHTML = generateInvoiceHTML(invoiceNumber, payment, profile, razorpay_payment_id, razorpay_order_id);
    
    // Store invoice in database
    const { data: invoiceData } = await supabase
      .from("invoices")
      .insert({
        user_id: user.id,
        payment_id: razorpay_payment_id,
        invoice_number: invoiceNumber,
        invoice_type: payment.plan ? 'subscription' : 'words',
        amount: payment.amount,
        currency: payment.currency,
        plan_name: payment.plan,
        words_purchased: wordsPurchased,
        payment_method: 'razorpay',
        razorpay_order_id: razorpay_order_id,
        razorpay_payment_id: razorpay_payment_id,
        razorpay_signature: razorpay_signature
      })
      .select()
      .single();
    
    // Store invoice HTML in storage bucket
    if (invoiceData) {
      const invoiceBlob = new Blob([invoiceHTML], { type: 'text/html' });
      const invoicePath = `${user.id}/${invoiceNumber}.html`;
      
      await supabase.storage
        .from('invoices')
        .upload(invoicePath, invoiceBlob, {
          contentType: 'text/html',
          upsert: true
        });
      
      // Update invoice with PDF URL
      await supabase
        .from('invoices')
        .update({ pdf_url: invoicePath })
        .eq('id', invoiceData.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        payment_id: razorpay_payment_id,
        message: "Payment verified successfully"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    console.error("Payment verification error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
