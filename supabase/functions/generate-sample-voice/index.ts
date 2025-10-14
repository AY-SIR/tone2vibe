import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

// --- CORS headers for browser access ---
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

// --- A helper function for creating standardized error responses ---
const createErrorResponse = (message: string, status: number) => {
  return new Response(JSON.stringify({ success: false, error: message }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status
  });
};

// --- Main function logic ---
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // --- Authenticate the user ---
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return createErrorResponse("User not authenticated.", 401);
    }

    // --- Parse request body to ensure it's valid, but we won't use it for the sample ---
    // This validates that the frontend is sending the correct data format.
    const body = await req.json();
    if (!body.text || !body.voice_settings) {
      return createErrorResponse("Invalid request body. Missing text or voice_settings.", 400);
    }

    // --- (PLACEHOLDER) Always return the same public MP3 file for the sample ---
    // This allows you to test the frontend flow without using a real TTS API yet.
    const publicUrl = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";

    return new Response(JSON.stringify({ success: true, audio_url: publicUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200
    });

  } catch (err) {
    console.error("Sample generation function error:", err);
    return createErrorResponse(err.message || "An internal server error occurred.", 500);
  }
});