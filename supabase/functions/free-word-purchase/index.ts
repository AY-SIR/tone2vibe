import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { generateInvoiceHTML } from "../_shared/invoice-template.ts";

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(req);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Server configuration error");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ------------------ AUTH CHECK ------------------
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonError("Please log in to continue.", 401, corsHeaders);
    }

    const token = authHeader.replace("Bearer ", "").trim();
    const { data: userData, error: authError } = await supabase.auth.getUser(token);

    if (authError || !userData?.user) {
      return jsonError("Your session has expired. Please log in again.", 401, corsHeaders);
    }

    const user = userData.user;

    // ------------------ PARSE BODY ------------------
    let body;
    try {
      body = await req.json();
    } catch {
      return jsonError("Invalid request format", 400, corsHeaders);
    }

    const { coupon_code, words_amount, user_plan } = body;

    if (!coupon_code || !words_amount || !user_plan) {
      return jsonError("Please provide all required information to continue.", 400, corsHeaders);
    }

    if (typeof words_amount !== "number" || words_amount < 1000) {
      return jsonError("Words amount must be at least 1000", 400, corsHeaders);
    }

    if (!["pro", "premium"].includes(user_plan.toLowerCase())) {
      return jsonError("Invalid user plan. Only Pro and Premium users can purchase words.", 400, corsHeaders);
    }

    // ------------------ COUPON VALIDATION ------------------
    const normalizedCode = coupon_code.trim().toLowerCase();

    const { data: coupons, error: couponError } = await supabase
      .from("coupons")
      .select("*")
      .ilike("code", normalizedCode) // case-insensitive check
      .eq("active", true)
      .in("type", ["words", "both"]);

    if (couponError) throw new Error("Failed to validate coupon");

    if (!coupons || coupons.length === 0) {
      return jsonError("This coupon is not valid for word purchases.", 400, corsHeaders);
    }

    const coupon = coupons[0];

    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      return jsonError("This coupon has expired.", 400, corsHeaders);
    }

    if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
      return jsonError("This coupon has already been used the maximum number of times.", 400, corsHeaders);
    }

    // ALWAYS FREE — zero final price
    const finalAmount = 0;

    // ------------------ UPDATE COUPON USAGE ------------------
    await supabase
      .from("coupons")
      .update({
        used_count: (coupon.used_count || 0) + 1,
        last_used_at: new Date().toISOString(),
      })
      .eq("id", coupon.id);

    // ------------------ ADD WORDS TO USER ------------------
    const freePaymentId = `FREE_WORDS_${coupon.code}_${Date.now()}`;

    const { error: rpcError } = await supabase.rpc("add_purchased_words", {
      user_id_param: user.id,
      words_to_add: words_amount,
      payment_id_param: freePaymentId,
    });

    if (rpcError) throw new Error("Words added but failed to update account.");

    // ------------------ GET PROFILE ------------------
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("user_id", user.id)
      .single();

    // ------------------ GENERATE INVOICE ------------------
    const invoiceNumber = `INV-${Date.now()}-${user.id.substring(0, 6)}`;

    const invoiceHTML = generateInvoiceHTML({
      invoiceNumber,
      customerName: profile?.full_name || "Customer",
      customerEmail: profile?.email || user.email || "",
      date: new Date().toLocaleDateString("en-IN"),
      time: new Date().toLocaleTimeString("en-IN"),
      transactionId: freePaymentId,
      paymentMethod: `FREE (Coupon: ${coupon.code})`,
      items: [
        {
          description: `${words_amount} Words`,
          quantity: 1,
          rate: 0,
          amount: 0,
        },
      ],
      subtotal: 0,
      discount: 0,
      total: 0,
      isFree: true,
    });

    // Store invoice
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
        plan_name: user_plan,
      })
      .select()
      .single();

    if (invoiceData) {
      const filePath = `${user.id}/${invoiceNumber}.html`;
      const blob = new Blob([invoiceHTML], { type: "text/html" });
      await supabase.storage.from("invoices").upload(filePath, blob, { upsert: true });

      await supabase.from("invoices").update({ pdf_url: filePath }).eq("id", invoiceData.id);
    }

    // ------------------ SUCCESS RESPONSE ------------------
    return new Response(
      JSON.stringify({
        success: true,
        message: `${words_amount.toLocaleString()} words added for FREE!`,
        payment_id: freePaymentId,
        invoice_number: invoiceNumber,
        final_amount: 0,
        words_added: words_amount,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    return jsonError(error.message || "Unexpected server error", 500, corsHeaders);
  }
});

// helper
function jsonError(message: string, status: number, corsHeaders: any) {
  return new Response(JSON.stringify({ success: false, error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
