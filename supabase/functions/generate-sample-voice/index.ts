import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user) throw new Error("User not authenticated");

    const { voice_settings = {} } = await req.json();

    console.log("🎤 Sample generation request - NO WORD DEDUCTION");
    console.log("⚠️  This is placeholder - connect real TTS for samples");

    // Sample text for preview (no word deduction, no history saving)
    const sampleText = "This is a test sample of your voice. Listen carefully to evaluate the quality.";

    // IMPORTANT: Replace with actual TTS API call for sample
    // For now, throw error to prevent false success
    throw new Error("Sample TTS service not configured. Please connect ElevenLabs or OpenAI TTS.");

    /* TEMPLATE FOR REAL SAMPLE GENERATION:
    
    const elevenLabsResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': Deno.env.get('ELEVENLABS_API_KEY')
      },
      body: JSON.stringify({
        text: sampleText,
        model_id: "eleven_multilingual_v2",
        voice_settings: voice_settings
      })
    });

    if (!elevenLabsResponse.ok) {
      throw new Error(`Sample TTS API error: ${elevenLabsResponse.statusText}`);
    }

    const audioData = await elevenLabsResponse.arrayBuffer();
    
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const fileName = `samples/${user.id}/sample-${Date.now()}.mp3`;
    const { error: uploadError } = await supabaseService.storage
      .from("user-generates")
      .upload(fileName, new Uint8Array(audioData), {
        contentType: "audio/mpeg",
        upsert: true,
      });

    if (uploadError) {
      throw new Error("Failed to save sample audio");
    }

    const { data: urlData } = supabaseService.storage
      .from("user-generates")
      .getPublicUrl(fileName);

    // Auto-cleanup after 5 minutes
    setTimeout(async () => {
      try {
        await supabaseService.storage.from("user-generates").remove([fileName]);
      } catch (error) {
        console.error("Sample cleanup failed:", error);
      }
    }, 5 * 60 * 1000);

    return new Response(JSON.stringify({
      success: true,
      audio_url: urlData.publicUrl,
      sample_text: sampleText,
      expires_in_minutes: 5,
      is_sample: true
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
    
    */

  } catch (error) {
    console.error("Sample generation error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || "Sample generation failed"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
