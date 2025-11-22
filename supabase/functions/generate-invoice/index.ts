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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Please log in to view invoices."
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

    const { invoice_id } = await req.json();
    
    if (!invoice_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invoice ID is required."
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Fetch invoice details
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", invoice_id)
      .eq("user_id", user.id)
      .single();

    if (invoiceError || !invoice) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invoice not found or you don't have permission to view it."
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Fetch user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("user_id", user.id)
      .single();

    // Determine if it's a word purchase or subscription
    const isWordPurchase = invoice.invoice_type === 'words';
    const wordsPurchased = invoice.words_purchased || 0;
    
    let items = [];
    if (isWordPurchase) {
      const plan = invoice.plan_name || 'pro';
      const pricePerThousand = plan === 'premium' ? 9 : 11;
      
      items = [
        {
          description: `${wordsPurchased.toLocaleString()} Words (${plan.toUpperCase()} Plan - ₹${pricePerThousand}/1000 words)`,
          quantity: 1,
          rate: invoice.amount,
          amount: invoice.amount
        }
      ];
    } else {
      items = [
        {
          description: `${invoice.plan_name?.charAt(0).toUpperCase() + invoice.plan_name?.slice(1)} Plan - Monthly Subscription`,
          quantity: 1,
          rate: invoice.amount,
          amount: invoice.amount
        }
      ];
    }

    const invoiceHTML = generateInvoiceHTML({
      invoiceNumber: invoice.invoice_number,
      customerName: profile?.full_name || "Valued Customer",
      customerEmail: profile?.email || "",
      date: new Date(invoice.created_at).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "long",
        day: "numeric"
      }),
      time: new Date(invoice.created_at).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit"
      }),
      transactionId: invoice.razorpay_payment_id || invoice.payment_id,
      paymentMethod: invoice.payment_method === 'free' ? 'FREE ACTIVATION' : 
                     invoice.payment_method === 'coupon' ? 'COUPON' : 'Razorpay',
      items,
      subtotal: invoice.amount,
      discount: 0,
      total: invoice.amount,
      isFree: invoice.amount === 0,
      razorpayDetails: invoice.razorpay_order_id ? {
        orderId: invoice.razorpay_order_id,
        paymentId: invoice.razorpay_payment_id
      } : undefined,
      wordDetails: isWordPurchase && wordsPurchased > 0 ? {
        words: wordsPurchased,
        plan: invoice.plan_name || 'pro',
        pricePerThousand: invoice.plan_name === 'premium' ? 9 : 11
      } : null
    });

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
  } catch (error: unknown) {
    console.error("Invoice generation error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Unable to generate invoice. Please try again or contact support."
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});