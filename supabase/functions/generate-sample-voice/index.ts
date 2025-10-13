import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";
// === CORS headers ===
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};
// === Standardized error response ===
const createErrorResponse = (message, status)=>{
  return new Response(JSON.stringify({
    success: false,
    error: message
  }), {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    },
    status
  });
};
Deno.serve(async (req)=>{
  // Handle preflight CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders
    });
  }
  try {
    // === Optional: Authenticate user ===
    const supabaseClient = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_ANON_KEY"), {
      global: {
        headers: {
          Authorization: req.headers.get("Authorization")
        }
      }
    });
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return createErrorResponse("User not authenticated.", 401);
    // === Parse request body (even if ignored) ===
    await req.json().catch(()=>{});
    // === Always return the same public MP3 file ===
    const publicUrl = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";
    return new Response(JSON.stringify({
      success: true,
      audio_url: publicUrl
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      },
      status: 200
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return createErrorResponse(err.message || "An internal server error occurred.", 500);
  }
});
