
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
    const { sessionId, plan } = await req.json();

    if (!sessionId || !plan) {
      throw new Error("Session ID and plan are required");
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Retrieve the session
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status === "paid" || session.status === "complete") {
      // Initialize Supabase with service role
      const supabaseService = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } }
      );

      // Update order status
      const { data: order } = await supabaseService
        .from("orders")
        .select("*")
        .eq("stripe_session_id", sessionId)
        .single();

      if (order) {
        // Update order to paid
        await supabaseService
          .from("orders")
          .update({ status: "paid", updated_at: new Date().toISOString() })
          .eq("id", order.id);

        // Calculate plan dates
        const now = new Date();
        const planExpiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

        // Set word limits based on plan
        const wordLimits = {
          pro: { limit: 41000, upload: 25 },
          premium: { limit: 99999, upload: 100 }
        };

        const limits = wordLimits[plan] || wordLimits.pro;

        // Update user profile
        await supabaseService
          .from("profiles")
          .update({ 
            plan: plan,
            words_limit: limits.limit,
            upload_limit_mb: limits.upload,
            plan_expires_at: planExpiresAt.toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq("user_id", order.user_id);

        return new Response(JSON.stringify({ 
          success: true, 
          plan: plan,
          expiresAt: planExpiresAt.toISOString()
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    }

    return new Response(JSON.stringify({ success: false, message: "Payment not completed" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  } catch (error) {
    console.error("Payment verification error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
