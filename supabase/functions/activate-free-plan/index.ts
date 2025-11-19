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

    // --- Create payment record with consistent payment_id ---
    const freePaymentId = `FREE_PLAN_${coupon_code || 'DIRECT'}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    
    console.log(`Creating payment record for user ${user_id} with payment_id: ${freePaymentId}`);
    
    const { error: paymentError } = await supabaseAdmin
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
      });

    if (paymentError) {
      console.error('Failed to create payment record:', paymentError);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "Failed to create payment record",
          details: paymentError.message 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Payment record created successfully with ID: ${freePaymentId}`);

    // --- Generate Invoice (linked to payment via payment_id) ---
    const invoiceNumber = `INV-${Date.now()}-${user_id.substring(0, 8)}`;
    
    console.log(`Creating invoice ${invoiceNumber} for payment ${freePaymentId}`);
    
    // Get user profile for invoice details
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('full_name, email')
      .eq('user_id', user_id)
      .single();

    // Generate invoice HTML
    const invoiceHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; }
    .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #000; padding-bottom: 20px; }
    .company-name { font-size: 28px; font-weight: bold; margin-bottom: 10px; }
    .invoice-details { margin-bottom: 30px; }
    .details-row { display: flex; justify-content: space-between; margin: 10px 0; }
    .label { font-weight: bold; }
    .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .table th, .table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
    .table th { background-color: #f2f2f2; }
    .total { font-size: 20px; font-weight: bold; text-align: right; margin-top: 20px; }
    .footer { margin-top: 40px; text-align: center; color: #666; font-size: 12px; }
    .free-badge { color: #10b981; font-weight: bold; }
  </style>
</head>
<body>
  <div class="header">
    <div class="company-name">Tone2Vibe</div>
    <div>https://tone2vibe.in</div>
  </div>

  <div class="invoice-details">
    <h2>INVOICE</h2>
    <div class="details-row">
      <div><span class="label">Invoice Number:</span> ${invoiceNumber}</div>
      <div><span class="label">Date:</span> ${new Date().toLocaleDateString('en-IN')}</div>
    </div>
    <div class="details-row">
      <div><span class="label">Customer:</span> ${profile?.full_name || 'User'}</div>
      <div><span class="label">Email:</span> ${profile?.email || ''}</div>
    </div>
    <div class="details-row">
      <div><span class="label">Transaction ID:</span> ${freePaymentId}</div>
      <div><span class="label">Payment Method:</span> FREE ACTIVATION</div>
    </div>
  </div>

  <table class="table">
    <thead>
      <tr>
        <th>Description</th>
        <th>Quantity</th>
        <th>Rate</th>
        <th>Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan - Free Activation ${coupon_code ? '(Coupon: ' + coupon_code + ')' : ''}</td>
        <td>1</td>
        <td class="free-badge">INR 0.00 (FREE)</td>
        <td class="free-badge">INR 0.00</td>
      </tr>
    </tbody>
  </table>

  <div class="total">
    Total: <span class="free-badge">INR 0.00 (FREE)</span>
  </div>

  <div class="footer">
    <p>Thank you for choosing Tone2Vibe!</p>
    <p>For support, contact: support@tone2vibe.in</p>
    <p>This is a computer-generated invoice and does not require a signature.</p>
  </div>
</body>
</html>
    `;

    // Store invoice in database (linked via payment_id)
    const { data: invoiceData, error: invoiceError } = await supabaseAdmin
      .from("invoices")
      .insert({
        user_id: user_id,
        payment_id: freePaymentId,  // Links to payments table
        invoice_number: invoiceNumber,
        invoice_type: 'subscription',
        amount: 0,
        currency: 'INR',
        plan_name: plan,  // Matches payments.plan
        payment_method: 'free',
        words_purchased: null,
        razorpay_order_id: null,
        razorpay_payment_id: null,
        razorpay_signature: null
      })
      .select()
      .single();

    if (invoiceError) {
      console.error('Failed to create invoice:', invoiceError);
      // Don't fail activation - invoice is optional
      return new Response(
        JSON.stringify({
          success: true,
          message: `${plan} plan activated! (Invoice generation failed)`,
          discount,
          payment_id: freePaymentId,
          invoice_number: null,
          warning: 'Invoice generation failed'
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Invoice created successfully: ${invoiceNumber}`);

    // Store invoice HTML in storage bucket
    if (invoiceData) {
      try {
        const invoiceBlob = new Blob([invoiceHTML], { type: 'text/html' });
        const invoicePath = `${user_id}/${invoiceNumber}.html`;
        
        await supabaseAdmin.storage
          .from('invoices')
          .upload(invoicePath, invoiceBlob, {
            contentType: 'text/html',
            upsert: true
          });
        
        // Update invoice with file path
        await supabaseAdmin
          .from('invoices')
          .update({ pdf_url: invoicePath })
          .eq('id', invoiceData.id);
      } catch (storageError) {
        console.error('Failed to store invoice HTML:', storageError);
        // Don't fail the activation
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `${plan} plan activated successfully!`,
        discount,
        payment_id: freePaymentId,
        invoice_number: invoiceNumber,
        plan: plan
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('Free plan activation error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : String(error) 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
