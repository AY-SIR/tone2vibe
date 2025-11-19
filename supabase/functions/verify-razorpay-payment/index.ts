
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { generateInvoicePDF } from "./helpers.ts";

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(req);
  }

  try {
    // Env
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase env vars not configured");
    }
    if (!razorpayKeySecret) {
      throw new Error("Razorpay key secret not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData?.user) throw new Error("Unauthorized");
    const user = authData.user;

    // Body
    const body = await req.json().catch(() => ({}));
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      throw new Error("Missing required Razorpay fields");
    }

    // Verify signature: HMAC SHA256 of "<order_id>|<payment_id>" using RAZORPAY_KEY_SECRET
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

    const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, message);
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");

    if (expectedSignature !== razorpay_signature) {
      throw new Error("Invalid payment signature");
    }

    // Fetch payment record (assumes you originally created a payments row keyed by razorpay_order_id)
    const { data: payment, error: paymentFetchError } = await supabase
      .from("payments")
      .select("*")
      .eq("payment_id", razorpay_order_id) // adjust column if you store order id in a different field
      .eq("user_id", user.id)
      .single();

    if (paymentFetchError || !payment) {
      throw new Error("Payment record not found");
    }

    // Update payment status to completed and set real payment id
    const { error: updateError } = await supabase
      .from("payments")
      .update({
        status: "completed",
        payment_id: razorpay_payment_id, // store actual payment id
      })
      .eq("payment_id", razorpay_order_id)
      .eq("user_id", user.id);

    if (updateError) throw updateError;

    // Handle subscription or word purchase
    let wordsPurchased: number | null = null;

    if (payment.plan) {
      // subscription
      const planLimits: Record<string, { words_limit: number; upload_limit_mb: number }> = {
        pro: { words_limit: 10000, upload_limit_mb: 25 },
        premium: { words_limit: 50000, upload_limit_mb: 100 },
      };

      const limits = planLimits[payment.plan] || { words_limit: 10000, upload_limit_mb: 25 };

      // Call stored procedure to update profile safely
      const { error: rpcError } = await supabase.rpc('safe_update_profile_for_subscription', {
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
      if (rpcError) throw rpcError;
    } else {
      // word purchase: compute words based on previous logic
      const { data: userProfile, error: profileErr } = await supabase
        .from('profiles')
        .select('plan')
        .eq('user_id', user.id)
        .single();

      const pricePerThousand = userProfile?.plan === 'premium' ? 9 : 11;
      const wordCount = Math.floor((payment.amount / 100) / pricePerThousand * 1000);
      wordsPurchased = wordCount;

      const { error: addWordsError } = await supabase.rpc('add_purchased_words', {
        user_id_param: user.id,
        words_to_add: wordCount,
        payment_id_param: razorpay_payment_id
      });
      if (addWordsError) throw addWordsError;
    }

    // --- Generate PDF bytes using helper ---
    // Get profile details to include on invoice
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('user_id', user.id)
      .single();

    const invoiceNumber = `INV-${Date.now()}-${user.id.substring(0, 8)}`;

    const pdfBytes = await generateInvoicePDF(
      invoiceNumber,
      payment,
      profile,
      razorpay_payment_id,
      razorpay_order_id,
      wordsPurchased
    ); // returns Uint8Array

    // Upload PDF to storage bucket 'invoices'
    const pdfPath = `${user.id}/${invoiceNumber}.pdf`;

    // supabase-js upload in Deno accepts a Blob or Uint8Array
    const uploadResult = await supabase.storage
      .from("invoices")
      .upload(pdfPath, new Blob([pdfBytes]), {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadResult.error) {
      throw uploadResult.error;
    }

    // Insert invoice record in DB (store path in pdf_url)
    const { data: invoiceData, error: invoiceInsertError } = await supabase
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
        razorpay_signature: razorpay_signature,
        pdf_url: pdfPath
      })
      .select()
      .single();

    if (invoiceInsertError) {
      throw invoiceInsertError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        payment_id: razorpay_payment_id,
        invoice: { id: invoiceData.id, pdf_path: pdfPath },
        message: "Payment verified and PDF invoice created & uploaded"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Payment verification error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error?.message || String(error),
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
