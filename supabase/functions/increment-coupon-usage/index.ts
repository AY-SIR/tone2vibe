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
    const { code } = await req.json();

    if (!code) {
      return new Response(
        JSON.stringify({ success: false, message: "Coupon code is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, message: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, message: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normalize coupon code
    const normalizedCode = code.trim().toLowerCase();

    // Step 1: Fetch coupon (case-insensitive)
    const { data: coupon, error: findError } = await supabaseAdmin
      .from("coupons")
      .select("*")
      .ilike("code", normalizedCode)
      .single();

    if (findError || !coupon) {
      return new Response(
        JSON.stringify({ success: false, message: "Coupon not found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 2: Update coupon usage
    const { error: updateError } = await supabaseAdmin
      .from("coupons")
      .update({
        used_count: coupon.used_count + 1,
        last_used_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("id", coupon.id);

    if (updateError) {
      console.error("Error incrementing coupon usage:", updateError);
      return new Response(
        JSON.stringify({ success: false, message: "Failed to update coupon usage" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "Coupon usage updated successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Coupon increment error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        message: error instanceof Error ? error.message : "Error updating coupon usage"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
