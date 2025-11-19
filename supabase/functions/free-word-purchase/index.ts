import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(req);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    const { coupon_code, words_amount } = await req.json();

    if (!coupon_code || !words_amount) {
      throw new Error("Missing required fields");
    }

    // Validate coupon
    const { data: coupons, error: couponError } = await supabase
      .from("coupons")
      .select("*")
      .eq("code", coupon_code)
      .eq("type", "words")
      .eq("active", true);

    if (couponError || !coupons || coupons.length === 0) {
      throw new Error("Invalid coupon code");
    }

    const coupon = coupons[0];

    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      throw new Error("Coupon has expired");
    }

    if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
      throw new Error("Coupon usage limit exceeded");
    }

    // Update coupon usage
    await supabase
      .from("coupons")
      .update({
        used_count: (coupon.used_count || 0) + 1,
        last_used_at: new Date().toISOString()
      })
      .eq("id", coupon.id);

    // Create payment record
    const freePaymentId = `FREE_WORDS_${coupon_code}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    
    await supabase
      .from("payments")
      .insert({
        user_id: user.id,
        amount: 0,
        currency: "INR",
        status: "completed",
        payment_id: freePaymentId,
        payment_method: "coupon",
        coupon_code: coupon_code,
        plan: null
      });

    // Add words to user balance using RPC
    await supabase.rpc('add_purchased_words', {
      user_id_param: user.id,
      words_to_add: words_amount,
      payment_id_param: freePaymentId
    });

    // Generate invoice
    const invoiceNumber = `INV-${Date.now()}-${user.id.substring(0, 8)}`;
    
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("user_id", user.id)
      .single();

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
      <div><span class="label">Date:</span> ${new Date().toLocaleDateString("en-IN")}</div>
    </div>
    <div class="details-row">
      <div><span class="label">Customer:</span> ${profile?.full_name || "User"}</div>
      <div><span class="label">Email:</span> ${profile?.email || ""}</div>
    </div>
    <div class="details-row">
      <div><span class="label">Transaction ID:</span> ${freePaymentId}</div>
      <div><span class="label">Payment Method:</span> FREE (Coupon: ${coupon_code})</div>
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
        <td>Word Purchase - ${words_amount.toLocaleString()} words (Coupon: ${coupon_code})</td>
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

    // Store invoice in database
    const { data: invoiceData } = await supabase
      .from("invoices")
      .insert({
        user_id: user.id,
        payment_id: freePaymentId,
        invoice_number: invoiceNumber,
        invoice_type: "words",
        amount: 0,
        currency: "INR",
        plan_name: null,
        words_purchased: words_amount,
        payment_method: "free",
        razorpay_order_id: null,
        razorpay_payment_id: null,
        razorpay_signature: null
      })
      .select()
      .single();

    // Store invoice HTML in storage
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
        message: "Words added successfully",
        payment_id: freePaymentId,
        invoice_number: invoiceNumber,
        words_added: words_amount
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    console.error("Free word purchase error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
