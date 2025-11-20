import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
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

    const { invoice_id } = await req.json();
    if (!invoice_id) throw new Error("Missing invoice ID");

    // Fetch invoice details
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", invoice_id)
      .eq("user_id", user.id)
      .single();

    if (invoiceError || !invoice) {
      throw new Error("Invoice not found");
    }

    // Fetch user profile for details
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("user_id", user.id)
      .single();

    // Generate simple HTML invoice
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
      <div><span class="label">Invoice Number:</span> ${invoice.invoice_number}</div>
      <div><span class="label">Date:</span> ${new Date(invoice.created_at).toLocaleDateString('en-IN')}</div>
    </div>
    <div class="details-row">
      <div><span class="label">Customer:</span> ${profile?.full_name || 'User'}</div>
      <div><span class="label">Email:</span> ${profile?.email || ''}</div>
    </div>
    <div class="details-row">
      <div><span class="label">Payment ID:</span> ${invoice.razorpay_payment_id}</div>
      <div><span class="label">Payment Method:</span> ${invoice.payment_method.toUpperCase()}</div>
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
        <td>${invoice.invoice_type === 'subscription' ? `${invoice.plan_name} Plan - Monthly Subscription` : `Word Purchase - ${invoice.words_purchased || 0} words`}</td>
        <td>1</td>
        <td>${invoice.currency} ${invoice.amount.toFixed(2)}</td>
        <td>${invoice.currency} ${invoice.amount.toFixed(2)}</td>
      </tr>
    </tbody>
  </table>

  <div class="total">
    Total: ${invoice.currency} ${invoice.amount.toFixed(2)}
  </div>

  <div class="footer">
    <p>Thank you for your business!</p>
    <p>For support, contact: support@tone2vibe.in</p>
    <p>This is a computer-generated invoice and does not require a signature.</p>
  </div>
</body>
</html>
    `;

    return new Response(
      JSON.stringify({
        success: true,
        invoice_html: invoiceHTML,
        invoice_number: invoice.invoice_number
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    console.error("Invoice generation error:", error);
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
