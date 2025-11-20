import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { generateInvoiceHTML } from "../_shared/invoice-template.ts";

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(req);
  }

  try {
    const requestBody = await req.json();
    const { plan, user_id, coupon_code } = requestBody;

    // Validate required fields
    if (!plan || !user_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Please provide all required information to continue."
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Plan limits configuration
    const planLimits = {
      free: { words_limit: 1000, upload_limit_mb: 10 },
      pro: { words_limit: 10000, upload_limit_mb: 25 },
      premium: { words_limit: 50000, upload_limit_mb: 100 }
    };

    const limits = planLimits[plan];
    if (!limits) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "The selected plan is not available. Please choose a valid plan."
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    let discount = 0;

    // Validate coupon if provided
    if (coupon_code) {
      const { data: coupons, error: couponError } = await supabaseAdmin
        .from("coupons")
        .select("*")
        .eq("code", coupon_code)
        .eq("type", "subscription");

      if (couponError || !coupons || coupons.length === 0) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "The coupon code you entered is not valid for subscription plans."
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      }

      if (coupons.length > 1) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Multiple coupons found. Please contact our support team for assistance."
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      }

      const coupon = coupons[0];

      // Check expiry
      if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "This coupon has expired and can no longer be used."
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      }

      // Check usage limit
      if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "This coupon has reached its maximum usage limit."
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      }

      // Update coupon usage
      const { error: couponUpdateError } = await supabaseAdmin
        .from("coupons")
        .update({
          used_count: (coupon.used_count || 0) + 1,
          last_used_at: new Date().toISOString()
        })
        .eq("id", coupon.id);

      if (couponUpdateError) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Unable to apply coupon. Please try again."
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      }

      discount = coupon.discount_amount || 0;
    }

    const now = new Date().toISOString();
    const expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    // Update user profile with plan
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({
        plan,
        words_limit: limits.words_limit,
        upload_limit_mb: limits.upload_limit_mb,
        plan_start_date: now,
        plan_end_date: expiryDate,
        plan_expires_at: expiryDate,
        plan_words_used: 0,
        updated_at: now
      })
      .eq("user_id", user_id);

    if (updateError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Unable to activate your plan. Please try again or contact support."
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Create payment record
    const freePaymentId = `FREE_PLAN_${coupon_code || 'DIRECT'}_${Date.now()}_${crypto.randomUUID().substring(0, 8)}`;

    const { data: paymentData, error: paymentError } = await supabaseAdmin
      .from("payments")
      .insert({
        user_id,
        plan,
        amount: 0,
        currency: "INR",
        status: "completed",
        payment_id: freePaymentId,
        payment_method: "coupon",
        coupon_code: coupon_code || null,
        created_at: now
      })
      .select()
      .single();

    if (paymentError || !paymentData) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Plan activated but payment record failed. Please contact support."
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Generate invoice
    const invoiceNumber = `INV-${Date.now()}-${user_id.substring(0, 8)}`;

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name, email")
      .eq("user_id", user_id)
      .single();

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
      transactionId: freePaymentId,
      paymentMethod: "FREE ACTIVATION",
      items: [
        {
          description: `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan - Free Activation${coupon_code ? ` (Coupon: ${coupon_code})` : ""}`,
          quantity: 1,
          rate: 0,
          amount: 0
        }
      ],
      subtotal: 0,
      discount: 0,
      total: 0,
      isFree: true
    });

    // Store invoice in database
    const { data: invoiceData, error: invoiceError } = await supabaseAdmin
      .from("invoices")
      .insert({
        user_id: user_id,
        payment_id: freePaymentId,
        invoice_number: invoiceNumber,
        invoice_type: "subscription",
        amount: 0,
        currency: "INR",
        plan_name: plan,
        payment_method: "free",
        words_purchased: null,
        razorpay_order_id: null,
        razorpay_payment_id: null,
        razorpay_signature: null
      })
      .select()
      .single();

    if (invoiceError) {
      return new Response(
        JSON.stringify({
          success: true,
          message: `${plan} plan activated successfully!`,
          discount,
          payment_id: freePaymentId,
          invoice_number: null,
          warning: "Invoice generation failed"
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Upload invoice to storage
    if (invoiceData) {
      try {
        const invoiceBlob = new Blob([invoiceHTML], { type: "text/html" });
        const invoicePath = `${user_id}/${invoiceNumber}.html`;

        await supabaseAdmin.storage
          .from("invoices")
          .upload(invoicePath, invoiceBlob, {
            contentType: "text/html",
            upsert: true
          });

        await supabaseAdmin
          .from("invoices")
          .update({ pdf_url: invoicePath })
          .eq("id", invoiceData.id);
      } catch (storageError) {
        console.error("Failed to store invoice HTML:", storageError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Your ${plan} plan has been activated successfully!`,
        discount,
        payment_id: freePaymentId,
        invoice_number: invoiceNumber,
        plan: plan
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    console.error("Free plan activation error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "We encountered an issue activating your plan. Please try again or contact support."
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});