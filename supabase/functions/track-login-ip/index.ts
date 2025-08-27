import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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
    console.log("IP tracking function called - privacy-focused country-only tracking");

    // Get client IP - try multiple headers for different proxy setups
    const userIP = req.headers.get("x-forwarded-for") || 
                   req.headers.get("x-real-ip") || 
                   req.headers.get("cf-connecting-ip") ||
                   "127.0.0.1";

    // Clean up IP address - take first IP if multiple are present
    const cleanIP = userIP.split(',')[0].trim();
    console.log("Tracking IP:", cleanIP);

    // Get auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.log("No auth header provided");
      return new Response(JSON.stringify({ success: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Initialize Supabase
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Get user
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;

    if (!user) {
      console.log("User not authenticated");
      return new Response(JSON.stringify({ success: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Use service role for database operations
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Check if we already have an IP record for this user (prevent duplicate tracking)
    const { data: existingRecord } = await supabaseService
      .from("ip_tracking")
      .select("id, created_at")
      .eq("user_id", user.id)
      .single();

    if (existingRecord) {
      console.log("User already has IP tracking record from:", existingRecord.created_at);
      return new Response(JSON.stringify({ 
        success: true,
        message: "IP already tracked for this user (privacy: no duplicate tracking)",
        tracking_date: existingRecord.created_at
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get country info only (privacy-focused)
    let countryInfo = null;
    if (cleanIP !== "127.0.0.1" && cleanIP !== "unknown") {
      try {
        const ipResponse = await fetch(`http://ip-api.com/json/${cleanIP}?fields=status,country,countryCode`);
        if (ipResponse.ok) {
          const ipData = await ipResponse.json();
          if (ipData.status === 'success') {
            countryInfo = {
              country: ipData.country,
              countryCode: ipData.countryCode
            };
          }
        }
      } catch (e) {
        console.log("Country lookup failed (proceeding without location):", e.message);
      }
    }

    // Insert IP tracking record (country only for privacy)
    const { error: insertError } = await supabaseService.from("ip_tracking").insert({
      user_id: user.id,
      ip_address: cleanIP,
      country_code: countryInfo?.countryCode || null,
      country_name: countryInfo?.country || null,
      city: null, // Privacy: Never track city
      created_at: new Date().toISOString()
    });

    if (insertError) {
      console.error("Error inserting IP tracking:", insertError);
      throw new Error(`Database error: ${insertError.message}`);
    }

    // Update profile with country and login info (privacy-focused)
    const { error: profileError } = await supabaseService
      .from("profiles")
      .update({ 
        last_login_at: new Date().toISOString(),
        country: countryInfo?.country || null,
        // Note: login_count will be auto-incremented by trigger
      })
      .eq("user_id", user.id);

    if (profileError) {
      console.error("Error updating profile:", profileError);
    }

    console.log(`IP tracking completed for user: ${user.id} - Country: ${countryInfo?.country || 'Unknown'}`);

    return new Response(JSON.stringify({ 
      success: true,
      message: "Privacy-focused tracking completed",
      country: countryInfo?.country || "Unknown",
      privacy_note: "Only country is tracked, no city or precise location data"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("IP tracking error:", error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});