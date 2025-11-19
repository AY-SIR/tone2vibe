import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import { PDFDocument, StandardFonts } from "https://deno.land/x/pdf@v1.4.0/mod.ts";
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
    const { coupon_code, words_amount, original_amount, discount_amount, final_amount } = await req.json();

    if (!coupon_code || !words_amount) throw new Error("Missing required fields");

    // ================================
    //  VALIDATE COUPON
    // ================================
    const { data: coupons } = await supabase
      .from("coupons")
      .select("*")
      .eq("code", coupon_code)
      .in("type", ["words", "both"])
      .eq("active", true);

    if (!coupons || coupons.length === 0) throw new Error("Invalid coupon code");

    const coupon = coupons[0];

    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      throw new Error("Coupon has expired");
    }

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
    const freePaymentId = `FREE_WORDS_${coupon_code}_${Date.now()}_${crypto.randomUUID().substring(0, 6)}`;

    await supabase.from("word_purchases").insert({
      user_id: user.id,
      words_purchased: words_amount,
      amount_paid: final_amount,
      currency: "INR",
      payment_id: freePaymentId,
      payment_method: "coupon",
      status: "completed",
    });

    // RPC to add words
    await supabase.rpc("add_purchased_words", {
      user_id_param: user.id,
      words_to_add: words_amount,
      payment_id_param: freePaymentId,
    });

    // Fetch profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("user_id", user.id)
      .single();

    const invoiceNumber = `INV-${Date.now()}-${user.id.substring(0, 8)}`;

    // ================================
    //  GENERATE PDF INVOICE
    // ================================
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([595, 842]); // A4
    const font = await pdf.embedFont(StandardFonts.Helvetica);

    let y = 800;
    const write = (text: string) => {
      page.drawText(text, { x: 50, y, size: 12, font });
      y -= 20;
    };

    write("Tone2Vibe");
    write("https://tone2vibe.in");
    write("----------------------------------------");
    write("INVOICE");
    write(`Invoice Number: ${invoiceNumber}`);
    write(`Date: ${new Date().toLocaleDateString("en-IN")}`);
    write(`Customer: ${profile?.full_name || "User"}`);
    write(`Email: ${profile?.email || ""}`);
    write(`Transaction ID: ${freePaymentId}`);
    write(`Payment Method: FREE (Coupon: ${coupon_code})`);
    write("----------------------------------------");
    write(`Words Purchased: ${words_amount}`);
    write(`Original Price: INR ${original_amount}`);
    write(`Discount: INR ${discount_amount}`);
    write(`Final Amount: INR ${final_amount}`);
    write("----------------------------------------");
    write(`Qty: 1   Rate: INR ${original_amount}   Amount: INR ${final_amount}`);
    write("----------------------------------------");
    write("Thank you for choosing Tone2Vibe!");
    write("support@tone2vibe.in");

    const pdfBytes = await pdf.save();

    // ================================
    //  STORE INVOICE PDF
    // ================================
    const invoicePath = `${user.id}/${invoiceNumber}.pdf`;

    await supabase.storage
      .from("invoices")
      .upload(invoicePath, pdfBytes, {
        contentType: "application/pdf",
        upsert: true,
      });

    // Save invoice record
    const { data: invoiceRecord } = await supabase
      .from("invoices")
      .insert({
        user_id: user.id,
        payment_id: freePaymentId,
        invoice_number: invoiceNumber,
        invoice_type: "words",
        amount: final_amount,
        currency: "INR",
        words_purchased: words_amount,
        payment_method: "coupon",
        pdf_url: invoicePath,
      })
      .select()
      .single();

    // SUCCESS RESPONSE
    return new Response(
      JSON.stringify({
        success: true,
        message: "Words added successfully",
        payment_id: freePaymentId,
        invoice_number: invoiceNumber,
        words_added: words_amount,
        pdf_url: invoicePath,
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
