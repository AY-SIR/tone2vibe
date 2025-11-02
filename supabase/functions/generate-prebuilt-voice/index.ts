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
      throw new Error("Missing Supabase environment variables");
    }

    const supabaseService = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const body = await req.json();
    const { voice_id, sample_text, language } = body;

    if (!voice_id || !sample_text) {
      throw new Error("voice_id and sample_text are required");
    }

    console.log(`Generating prebuilt voice sample for voice_id: ${voice_id}`);

    // Check if audio already exists for this voice
    const { data: existingVoice } = await supabaseService
      .from("prebuilt_voices")
      .select("audio_preview_url")
      .eq("voice_id", voice_id)
      .single();

    if (existingVoice?.audio_preview_url) {
      // Audio already exists, return it
      return new Response(JSON.stringify({
        success: true,
        audio_url: existingVoice.audio_preview_url,
        cached: true
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Generate new audio (using sample MP3 for now)
    const response = await fetch(SAMPLE_MP3_URL);
    if (!response.ok) throw new Error("Failed to fetch sample audio");
    
    const mp3Data = new Uint8Array(await response.arrayBuffer());

    // Upload to public storage
    const filePath = `prebuilt-samples/${voice_id}.mp3`;
    const { error: uploadError } = await supabaseService.storage
      .from("user-generates")
      .upload(filePath, mp3Data, { 
        contentType: "audio/mpeg", 
        upsert: true,
        cacheControl: "3600"
      });

    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

    // Get public URL
    const { data: { publicUrl } } = supabaseService.storage
      .from("user-generates")
      .getPublicUrl(filePath);

    // Update prebuilt_voices table with audio URL
    const { error: updateError } = await supabaseService
      .from("prebuilt_voices")
      .update({ 
        audio_preview_url: publicUrl,
        updated_at: new Date().toISOString()
      })
      .eq("voice_id", voice_id);

    if (updateError) {
      console.error("Failed to update prebuilt voice:", updateError);
    }

    return new Response(JSON.stringify({
      success: true,
      audio_url: publicUrl,
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
