import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

const createErrorResponse = (message: string, status: number) => {
  return new Response(JSON.stringify({ success: false, error: message }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status
  });
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return createErrorResponse("User not authenticated.", 401);
    }

    const body = await req.json();
    if (!body.text || !body.voice_settings) {
      return createErrorResponse("Invalid request body. Missing text or voice_settings.", 400);
    }

    console.log("Sample generation - Voice settings received:", JSON.stringify(body.voice_settings, null, 2));
    console.log("Sample generation - Voice ID:", body.voice_settings.voice_id);

    if (!body.voice_settings.voice_id) {
      return createErrorResponse("Voice ID is required in voice_settings", 400);
    }

    const publicUrl = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";

    return new Response(JSON.stringify({
      success: true,
      audio_url: publicUrl,
      voice_id_used: body.voice_settings.voice_id
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200
    });

  } catch (err) {
    console.error("Sample generation function error:", err);
    return createErrorResponse(err.message || "An internal server error occurred.", 500);
  }
});