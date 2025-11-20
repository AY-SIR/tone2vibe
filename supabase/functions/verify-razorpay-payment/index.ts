import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { generateInvoiceHTML } from "../_shared/invoice-template.ts";

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(req);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    
    const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET");

    if (!supabaseUrl || !supabaseServiceKey || !razorpayKeySecret) {
      throw new Error("Payment configuration error");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Please log in to continue."
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Your session has expired. Please log in again."
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Payment verification failed due to missing information."
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Verify Razorpay signature
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
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    if (expectedSignature !== razorpay_signature) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Payment verification failed. Please contact support if amount was deducted."
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Fetch payment record
    const { data: payment, error: paymentFetchError } = await supabase
      .from("payments")
      .select("*")
      .eq("payment_id", razorpay_order_id)
      .eq("user_id", user.id)
      .single();

    if (paymentFetchError || !payment) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Payment record not found. Please contact support."
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
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

    if (updateError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Unable to update payment status. Please contact support."
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    let wordsPurchased = null;
    let userPlan = payment.plan;

    // Handle subscription or word purchase
    if (payment.plan) {
      // Subscription payment
      const planLimits: Record<string, { words_limit: number; upload_limit_mb: number }> = {
        pro: { words_limit: 10000, upload_limit_mb: 25 },
        premium: { words_limit: 50000, upload_limit_mb: 100 }
      };

      const limits = planLimits[payment.plan as string];

      const { error: profileError } = await supabase.rpc("safe_update_profile_for_subscription", {
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
        p_last_payment_method: "razorpay"
      });

      if (profileError) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Payment verified but unable to activate plan. Please contact support."
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      }
    } else {
      // Word purchase - get user's current plan
      const { data: userProfile } = await supabase
        .from("profiles")
        .select("plan")
        .eq("user_id", user.id)
        .single();

      userPlan = userProfile?.plan || "pro";
      const pricePerThousand = userPlan === "premium" ? 9 : 11;
      const wordCount = Math.floor((payment.amount / pricePerThousand) * 1000);
      wordsPurchased = wordCount;

      // Create word purchase record
      const { error: wordPurchaseError } = await supabase
        .from("word_purchases")
        .insert({
          user_id: user.id,
          words_purchased: wordCount,
          amount_paid: payment.amount,
          currency: "INR",
          payment_id: razorpay_payment_id,
          payment_method: "razorpay",
          status: "completed"
        });

      if (wordPurchaseError) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Payment verified but unable to record word purchase. Please contact support."
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      }

      // Add words to account
      const { error: rpcError } = await supabase.rpc("add_purchased_words", {
        user_id_param: user.id,
        words_to_add: wordCount,
        payment_id_param: razorpay_payment_id
      });

      if (rpcError) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Payment verified but unable to credit words. Please contact support."
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      }
    }

    // Generate invoice
    const invoiceNumber = `INV-${Date.now()}-${user.id.substring(0, 8)}`;

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("user_id", user.id)
      .single();

    let items = [];
    if (payment.plan) {
      items = [
        {
          description: `${payment.plan.charAt(0).toUpperCase() + payment.plan.slice(1)} Plan - Monthly Subscription`,
          quantity: 1,
          rate: payment.amount,
          amount: payment.amount
        }
      ];
    } else {
      const pricePerThousand = userPlan === "premium" ? 9 : 11;
      items = [
        {
          description: `${(wordsPurchased || 0).toLocaleString()} Words (${userPlan.toUpperCase()} Plan - ₹${pricePerThousand}/1000 words)`,
          quantity: 1,
          rate: payment.amount,
          amount: payment.amount
        }
      ];
    }

    const invoiceHTML = generateInvoiceHTML({
      invoiceNumber,
      customerName: profile?.full_name || "Valued Customer",
      customerEmail: profile?.email || "",
      date: new Date().toLocaleDateString("en-IN", {
        year: "numeric",
        month: "long",
        day: "numeric"
      }),
      time: new Date().toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit"
      }),
      transactionId: razorpay_payment_id,
      paymentMethod: "Razorpay",
      items,
      subtotal: payment.amount,
      discount: 0,
      total: payment.amount,
      isFree: false,
      razorpayDetails: {
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id
      },
      wordDetails: wordsPurchased
        ? {
            words: wordsPurchased,
            plan: userPlan,
            pricePerThousand: userPlan === "premium" ? 9 : 11
          }
        : null
    });

    // Store invoice
    const { data: invoiceData } = await supabase
      .from("invoices")
      .insert({
        user_id: user.id,
        payment_id: razorpay_payment_id,
        invoice_number: invoiceNumber,
        invoice_type: payment.plan ? "subscription" : "words",
        amount: payment.amount,
        currency: payment.currency,
        plan_name: payment.plan || userPlan,
        words_purchased: wordsPurchased,
        payment_method: "razorpay",
        razorpay_order_id: razorpay_order_id,
        razorpay_payment_id: razorpay_payment_id,
        razorpay_signature: razorpay_signature
      })
      .select()
      .single();

    if (invoiceData) {
      const invoiceBlob = new Blob([invoiceHTML], { type: "text/html" });
      const invoicePath = `${user.id}/${invoiceNumber}.html`;

      await supabase.storage
        .from("invoices")
        .upload(invoicePath, invoiceBlob, {
          contentType: "text/html",
          upsert: true
        });

      await supabase
        .from("invoices")
        .update({ pdf_url: invoicePath })
        .eq("id", invoiceData.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        payment_id: razorpay_payment_id,
        invoice_number: invoiceNumber,
        message: "Payment verified successfully"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Unable to verify payment. Please contact support if amount was deducted."
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});