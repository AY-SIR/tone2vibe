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

    const supabaseService = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const body = await req.json();
    const { text, title, voice_settings, language } = body;

    if (!text || !title || !voice_settings || !language) {
      throw new Error("Request body must include text, title, voice_settings, and language.");
    }

    console.log("Voice settings received:", JSON.stringify(voice_settings, null, 2));
    console.log("Voice ID from settings:", voice_settings.voice_id);

    if (!voice_settings.voice_id) {
      throw new Error("Voice ID is required in voice_settings");
    }

    const actualWordCount = text.split(/\s+/).filter(Boolean).length;

    const { data: profile, error: profileError } = await supabaseService
      .from("profiles")
      .select("plan, words_limit, plan_words_used, word_balance")
      .eq("user_id", user.id)
      .single();

    if (profileError) throw new Error("User profile not found.");

    const totalWordsAvailable = (profile.words_limit || 0) - (profile.plan_words_used || 0) + (profile.word_balance || 0);
    if (actualWordCount > totalWordsAvailable) {
      throw new Error(`Insufficient word balance. Need ${actualWordCount}, but have ${totalWordsAvailable}.`);
    }

    const { data: historyRecord, error: historyError } = await supabaseService
      .from("history")
      .insert({
        user_id: user.id,
        title,
        original_text: text,
        voice_settings: voice_settings,
        words_used: actualWordCount,
        generation_started_at: new Date().toISOString(),
        language: language
      })
      .select("id, generation_started_at")
      .single();

    if (historyError) throw new Error(`Failed to create history record: ${historyError.message}`);

    const response = await fetch(SAMPLE_MP3_URL);
    if (!response.ok) throw new Error("Failed to fetch sample MP3.");
    const mp3Data = new Uint8Array(await response.arrayBuffer());

    const filePath = `${user.id}/${historyRecord.id}.mp3`;
    const { error: uploadError } = await supabaseService.storage
      .from("user-generates")
      .upload(filePath, mp3Data, { contentType: "audio/mpeg", upsert: true });

    if (uploadError) throw new Error(`Failed to upload MP3: ${uploadError.message}`);

    const { data: urlData } = supabaseService.storage.from("user-generates").getPublicUrl(filePath);
    const publicUrl = urlData?.publicUrl;
    if (!publicUrl) throw new Error("Could not retrieve public URL.");

    const generationCompletedAt = new Date();
    const { error: updateError } = await supabaseService
      .from("history")
      .update({
        audio_url: publicUrl,
        generation_completed_at: generationCompletedAt.toISOString(),
        processing_time_ms: generationCompletedAt.getTime() - new Date(historyRecord.generation_started_at).getTime(),
        language: language
      })
      .eq("id", historyRecord.id);

    if (updateError) {
      console.error(`Failed to update history record ${historyRecord.id}:`, updateError.message);
    }

    const { error: deductError } = await supabaseService.rpc("deduct_words_smartly", {
      user_id_param: user.id,
      words_to_deduct: actualWordCount,
    });

    if (deductError) {
      console.error(`Failed to deduct words for user ${user.id}:`, deductError.message);
    }

    return new Response(JSON.stringify({
      success: true,
      audio_url: publicUrl,
      history_id: historyRecord.id,
      voice_id_used: voice_settings.voice_id
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Generation function error:", error.message);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});