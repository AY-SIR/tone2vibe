
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
    // Get user's IP for currency detection
    const userIP = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1";
    let currency = "usd";
    let isIndian = false;
    
    try {
      const ipResponse = await fetch(`http://ip-api.com/json/${userIP}`);
      const ipData = await ipResponse.json();
      
      if (ipData.countryCode === "IN") {
        currency = "inr";
        isIndian = true;
      }
    } catch (e) {
      console.log("IP detection failed, using USD");
    }

    // Initialize Supabase
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Get authenticated user
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated");

    // Get request data
    const { plan } = await req.json();

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Set pricing based on location
    const pricing = {
      pro: isIndian ? 9900 : 170, // ₹99 or $1.70 in cents
      premium: isIndian ? 29900 : 401, // ₹299 or $4.01 in cents
    };

    const planNames = {
      pro: "Pro Plan",
      premium: "Premium Plan"
    };

    if (!pricing[plan]) {
      throw new Error("Invalid plan selected");
    }

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: currency,
            product_data: { 
              name: planNames[plan],
              description: `Monthly subscription to ${planNames[plan]}`
            },
            unit_amount: pricing[plan],
            recurring: { interval: "month" },
          },
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${req.headers.get("origin")}/payment-success?session_id={CHECKOUT_SESSION_ID}&plan=${plan}`,
      cancel_url: `${req.headers.get("origin")}/payment`,
      metadata: {
        user_id: user.id,
        plan: plan,
        currency: currency,
        country: isIndian ? "IN" : "OTHER"
      }
    });

    // Save order to database
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    await supabaseService.from("orders").insert({
      user_id: user.id,
      stripe_session_id: session.id,
      amount: pricing[plan],
      currency: currency,
      plan: plan,
      status: "pending",
      created_at: new Date().toISOString()
    });

    return new Response(JSON.stringify({ url: session.url, currency }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Payment creation error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
