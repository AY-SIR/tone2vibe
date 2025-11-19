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
    // ENV
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // AUTH
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const token = authHeader.replace("Bearer ", "").trim();
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData?.user) throw new Error("Unauthorized");

    const user = userData.user;

    // BODY
    const { coupon_code, words_amount } = await req.json();
    if (!coupon_code || !words_amount) throw new Error("Missing required fields");

    // ================================
    //  VALIDATE COUPON (EXACT MATCH)
    // ================================
    const { data: coupons, error: couponError } = await supabase
      .from("coupons")
      .select("*")
      .eq("code", coupon_code)               // EXACT match only
      .in("type", ["words", "both"])         // allow both
      .eq("active", true);                   // must be active

    if (couponError || !coupons || coupons.length === 0) {
      throw new Error("Invalid coupon code");
    }

    const coupon = coupons[0];

    // Expiry
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      throw new Error("Coupon has expired");
    }

    // Max uses
    if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
      throw new Error("Coupon usage limit exceeded");
    }

    // Update usage
    await supabase
      .from("coupons")
      .update({
        used_count: (coupon.used_count || 0) + 1,
        last_used_at: new Date().toISOString(),
      })
      .eq("id", coupon.id);

    // ================================
    //  CREATE PURCHASE RECORD
    // ================================
    const freePaymentId =
      `FREE_WORDS_${coupon_code}_${Date.now()}_${crypto.randomUUID().substring(0, 6)}`;

    await supabase.from("word_purchases").insert({
      user_id: user.id,
      words_purchased: words_amount,
      amount_paid: 0,
      currency: "INR",
      payment_id: freePaymentId,
      payment_method: "coupon",
      status: "completed",
    });

    // ================================
    //  ADD WORDS (RPC)
    // ================================
    await supabase.rpc("add_purchased_words", {
      user_id_param: user.id,
      words_to_add: words_amount,
      payment_id_param: freePaymentId,
    });

    // ================================
    //  GENERATE INVOICE HTML
    // ================================
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
  <meta charset="UTF-8" />
  <style>
    body { font-family: Arial; max-width: 800px; margin: 40px auto; padding: 20px; }
    .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #000; padding-bottom: 20px; }
    .company-name { font-size: 28px; font-weight: bold; }
    .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .table th, .table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
    .free { color: #10b981; font-weight: bold; }
  </style>
</head>
<body>
  <div class="header">
    <div class="company-name">Tone2Vibe</div>
    <div>https://tone2vibe.in</div>
  </div>

  <h2>INVOICE</h2>

  <p><b>Invoice Number:</b> ${invoiceNumber}</p>
  <p><b>Date:</b> ${new Date().toLocaleDateString("en-IN")}</p>
  <p><b>Customer:</b> ${profile?.full_name || "User"}</p>
  <p><b>Email:</b> ${profile?.email || ""}</p>
  <p><b>Transaction ID:</b> ${freePaymentId}</p>
  <p><b>Payment Method:</b> FREE (Coupon: ${coupon_code})</p>

  <table class="table">
    <thead>
      <tr>
        <th>Description</th><th>Qty</th><th>Rate</th><th>Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>${words_amount} Words (Coupon: ${coupon_code})</td>
        <td>1</td>
        <td class="free">INR 0.00</td>
        <td class="free">INR 0.00</td>
      </tr>
    </tbody>
  </table>

  <h3>Total: <span class="free">INR 0.00 (FREE)</span></h3>

  <p style="margin-top:40px; text-align:center; color:#666; font-size:12px;">
    Thank you for choosing Tone2Vibe!<br/>
    support@tone2vibe.in
  </p>
</body>
</html>
`;

    // ================================
    //  STORE INVOICE
    // ================================
    const { data: invoiceData } = await supabase
      .from("invoices")
      .insert({
        user_id: user.id,
        payment_id: freePaymentId,
        invoice_number: invoiceNumber,
        invoice_type: "words",
        amount: 0,
        currency: "INR",
        words_purchased: words_amount,
        payment_method: "free",
      })
      .select()
      .single();

    if (invoiceData) {
      const invoicePath = `${user.id}/${invoiceNumber}.html`;

      const blob = new Blob([invoiceHTML], { type: "text/html" });

      await supabase.storage
        .from("invoices")
        .upload(invoicePath, blob, { upsert: true });

      await supabase
        .from("invoices")
        .update({ pdf_url: invoicePath })
        .eq("id", invoiceData.id);
    }

    // SUCCESS RESPONSE
    return new Response(
      JSON.stringify({
        success: true,
        message: "Words added successfully",
        payment_id: freePaymentId,
        invoice_number: invoiceNumber,
        words_added: words_amount,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Free word purchase error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
