import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SAMPLE_MP3_URL = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing Supabase environment variables.");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header.");

    const supabaseClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error("User not authenticated.");

    const supabaseService = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json();
    const { voice_id, sample_text } = body;

    if (!voice_id || !sample_text) {
      throw new Error("voice_id and sample_text are required");
    }

    console.log("Generating prebuilt voice sample for voice_id:", voice_id);

    // Get voice from database
    const { data: voice, error: voiceError } = await supabaseService
      .from("prebuilt_voices")
      .select("*")
      .eq("voice_id", voice_id)
      .single();

    if (voiceError || !voice) {
      throw new Error("Voice not found");
    }

    // Check if audio preview already exists
    if (voice.audio_preview_url) {
      console.log("Returning existing audio preview");
      return new Response(JSON.stringify({
        success: true,
        audio_url: voice.audio_preview_url,
        voice_id: voice_id,
        cached: true
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Generate new audio (using sample MP3 for now)
    const response = await fetch(SAMPLE_MP3_URL);
    if (!response.ok) throw new Error("Failed to generate audio.");
    const mp3Data = new Uint8Array(await response.arrayBuffer());

    // Upload to storage
    const filePath = `prebuilt-previews/${voice_id}.mp3`;
    const { error: uploadError } = await supabaseService.storage
      .from("user-generates")
      .upload(filePath, mp3Data, { contentType: "audio/mpeg", upsert: true });

    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

    // Get public URL
    const { data: publicUrlData } = supabaseService.storage
      .from("user-generates")
      .getPublicUrl(filePath);

    const publicUrl = publicUrlData.publicUrl;

    // Update voice record with preview URL
    await supabaseService
      .from("prebuilt_voices")
      .update({ 
        audio_preview_url: publicUrl,
        updated_at: new Date().toISOString()
      })
      .eq("voice_id", voice_id);

    return new Response(JSON.stringify({
      success: true,
      audio_url: publicUrl,
      voice_id: voice_id,
      cached: false
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Prebuilt voice generation error:", error.message);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
