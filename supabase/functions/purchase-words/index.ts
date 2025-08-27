import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { wordCount, currency = 'USD' } = await req.json();
    
    if (!wordCount || wordCount < 1000) {
      throw new Error("Minimum purchase is 1000 words");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Get authenticated user
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");

    // Check if user has a paid plan (required for word purchases)
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { data: profile } = await supabaseService
      .from("profiles")
      .select("plan")
      .eq("user_id", user.id)
      .single();

    if (!profile || profile.plan === 'free') {
      throw new Error("Word purchases require a Pro or Premium plan");
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    // Calculate pricing
    const pricePerWord = currency === 'INR' ? 0.031 : 0.0005; // ₹0.031 or $0.0005 per word
    const totalAmount = Math.round(wordCount * pricePerWord * 100); // Convert to cents/paise
    const symbol = currency === 'INR' ? '₹' : '$';

    // Create checkout session for word purchase
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: { 
              name: `${wordCount.toLocaleString()} Words`,
              description: `Purchase ${wordCount.toLocaleString()} words that never expire`
            },
            unit_amount: totalAmount,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      metadata: {
        type: "word_purchase",
        user_id: user.id,
        word_count: wordCount.toString(),
      },
      success_url: `${req.headers.get("origin")}/payment-success?session_id={CHECKOUT_SESSION_ID}&type=words&count=${wordCount}`,
      cancel_url: `${req.headers.get("origin")}/payment?canceled=true`,
    });

    console.log(`Word purchase session created: ${wordCount} words for ${symbol}${(totalAmount/100).toFixed(2)}`);

    return new Response(JSON.stringify({ 
      url: session.url,
      amount: totalAmount / 100,
      currency,
      wordCount
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Word purchase error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});