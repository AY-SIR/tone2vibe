import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// OpenRouter API load balancing
const getOpenRouterKey = () => {
  const keys = [
    Deno.env.get("OPENROUTER_API_KEY_1"),
    Deno.env.get("OPENROUTER_API_KEY_2"),
  ].filter(Boolean);
  
  if (keys.length === 0) throw new Error("No OpenRouter API keys configured");
  
  // Simple round-robin selection
  const index = Math.floor(Math.random() * keys.length);
  return keys[index];
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

    const requestBody = await req.json();
    const { text, voice_settings, title, language = "en-US", voiceId, sampleText } = requestBody;

    console.log("📝 Full request data:", JSON.stringify(requestBody, null, 2));

    if (!text || !title) {
      throw new Error("Text and title are required");
    }

    const actualWordCount = text.split(/\s+/).filter(w => w.length > 0).length;

    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { data: profile } = await supabaseService
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!profile) throw new Error("User profile not found");

    const totalWordsAvailable = (profile.words_limit - profile.plan_words_used) + profile.word_balance;
    if (actualWordCount > totalWordsAvailable) {
      throw new Error(`Insufficient word balance. Need ${actualWordCount} words but only ${totalWordsAvailable} available.`);
    }

    console.log("🎯 Generating voice with OpenRouter TTS");
    
    // Call OpenRouter TTS API
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
      console.error("OpenRouter TTS error:", errorText);
      throw new Error(`TTS generation failed: ${ttsResponse.statusText}`);
    }

    const audioData = await ttsResponse.arrayBuffer();

    // Create history record
    const { data: historyRecord, error: historyError } = await supabaseService
      .from("history")
      .insert({
        user_id: user.id,
        title,
        original_text: text,
        language,
        voice_settings: { ...voice_settings, plan: profile.plan, voiceId, sampleText },
        words_used: actualWordCount,
        generation_started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (historyError) throw new Error("Failed to create history record");

    const fileName = `${user.id}/${historyRecord.id}.mp3`;
    const { error: uploadError } = await supabaseService.storage
      .from("user-generates")
      .upload(fileName, new Uint8Array(audioData), {
        contentType: "audio/mpeg",
      });

    if (uploadError) {
      await supabaseService.from("history").delete().eq("id", historyRecord.id);
      throw new Error("Failed to save audio file");
    }

    const { data: urlData } = supabaseService.storage
      .from("user-generates")
      .getPublicUrl(fileName);

    await supabaseService
      .from("history")
      .update({
        audio_url: urlData.publicUrl,
        generation_completed_at: new Date().toISOString(),
        processing_time_ms: Date.now() - new Date(historyRecord.generation_started_at).getTime()
      })
      .eq("id", historyRecord.id);

    // Deduct words after successful generation
    const { error: deductError } = await supabaseService.rpc('deduct_words_smartly', {
      user_id_param: user.id,
      words_to_deduct: actualWordCount
    });

    if (deductError) {
      console.error("Failed to deduct words:", deductError);
    }

    // Auto-cleanup for free users
    if (profile.plan === 'free') {
      setTimeout(async () => {
        try {
          await supabaseService.storage.from("user-generates").remove([fileName]);
          await supabaseService.from("history").update({ audio_url: null }).eq("id", historyRecord.id);
        } catch (error) {
          console.error("Cleanup failed:", error);
        }
      }, 5 * 60 * 1000);
    }

    return new Response(JSON.stringify({
      success: true,
      audio_url: urlData.publicUrl,
      history_id: historyRecord.id,
      words_used: actualWordCount,
      cleanup_in_minutes: profile.plan === 'free' ? 5 : null
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Voice generation error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || "Voice generation failed"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});