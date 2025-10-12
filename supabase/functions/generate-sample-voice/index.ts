import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const getOpenRouterKey = () => {
  const keys = [
    Deno.env.get("OPENROUTER_API_KEY_1"),
    Deno.env.get("OPENROUTER_API_KEY_2"),
  ].filter(Boolean);
  
  if (keys.length === 0) throw new Error("No OpenRouter API keys configured");
  return keys[Math.floor(Math.random() * keys.length)];
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
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

    const { voice_settings = {}, voiceId, sampleText } = await req.json();

    console.log("🎤 Sample generation - FREE (no word deduction)");

    const text = sampleText || "This is a test sample of your voice. Listen carefully to evaluate the quality.";

    const openRouterKey = getOpenRouterKey();
    const ttsResponse = await fetch("https://openrouter.ai/api/v1/audio/speech", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openRouterKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://msbmyiqhohtjdfbjmxlf.supabase.co",
      },
      body: JSON.stringify({
        model: "openai/tts-1",
        input: text,
        voice: voiceId || "alloy",
        speed: voice_settings?.speed || 1.0,
      }),
    });

    if (!ttsResponse.ok) {
      const errorText = await ttsResponse.text();
      console.error("Sample TTS error:", errorText);
      throw new Error(`Sample generation failed: ${ttsResponse.statusText}`);
    }

    const audioData = await ttsResponse.arrayBuffer();
    
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

    if (uploadError) throw new Error("Failed to save sample audio");

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
      sample_text: text,
      expires_in_minutes: 5,
      is_sample: true
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

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