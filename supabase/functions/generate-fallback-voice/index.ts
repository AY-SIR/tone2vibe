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

    const { text, title, language = "en-US" } = await req.json();

    if (!text || !title) throw new Error("Text and title are required");

    console.log("🔄 Fallback generation using OpenRouter");
    
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
        voice: "alloy",
        speed: 1.0,
      }),
    });

    if (!ttsResponse.ok) {
      throw new Error(`Fallback TTS failed: ${ttsResponse.statusText}`);
    }

    const audioData = await ttsResponse.arrayBuffer();
    
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const fileName = `fallback/${user.id}/fallback-${Date.now()}.mp3`;
    const { error: uploadError } = await supabaseService.storage
      .from("user-generates")
      .upload(fileName, new Uint8Array(audioData), {
        contentType: "audio/mpeg",
      });

    if (uploadError) throw new Error("Failed to save fallback audio");

    const { data: urlData } = supabaseService.storage
      .from("user-generates")
      .getPublicUrl(fileName);

    return new Response(JSON.stringify({
      success: true,
      audio_url: urlData.publicUrl,
      is_fallback: true
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Fallback generation error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});