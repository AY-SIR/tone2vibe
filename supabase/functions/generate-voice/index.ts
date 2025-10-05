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

    // Get authenticated user
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user) throw new Error("User not authenticated");

    const { text, voice_settings, title, language = "en-US" } = await req.json();

    if (!text || !title) {
      throw new Error("Text and title are required");
    }

    // Count words for billing
    const actualWordCount = text.split(/\s+/).length;

    // Get user profile to check limits
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

    if (!profile) {
      throw new Error("User profile not found");
    }

    // Check word limits BEFORE creating any records
    const totalWordsAvailable = (profile.words_limit - profile.plan_words_used) + profile.word_balance;
    if (actualWordCount > totalWordsAvailable) {
      throw new Error(`Insufficient word balance. Need ${actualWordCount} words but only ${totalWordsAvailable} available.`);
    }

    console.log("🚨 CRITICAL: Voice generation with placeholder audio - NO REAL TTS SERVICE CONFIGURED");
    console.log("⚠️  This will create placeholder audio and deduct words");
    console.log("⚠️  To connect real TTS service, update this edge function");
    
    // IMPORTANT: This is placeholder implementation
    // Replace this section with actual TTS API call (ElevenLabs, OpenAI, etc.)
    // For now, throw error to prevent false success and word deduction
    throw new Error("TTS service not configured. Please connect ElevenLabs or OpenAI TTS in edge function.");

    /* TEMPLATE FOR REAL TTS IMPLEMENTATION:
    
    // Example: Call ElevenLabs API
    const elevenLabsResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': Deno.env.get('ELEVENLABS_API_KEY')
      },
      body: JSON.stringify({
        text: text,
        model_id: "eleven_multilingual_v2",
        voice_settings: voice_settings
      })
    });

    if (!elevenLabsResponse.ok) {
      throw new Error(`TTS API error: ${elevenLabsResponse.statusText}`);
    }

    const audioData = await elevenLabsResponse.arrayBuffer();
    
    // Now proceed with creating history record and uploading...
    const { data: historyRecord, error: historyError } = await supabaseService
      .from("history")
      .insert({
        user_id: user.id,
        title,
        original_text: text,
        language,
        voice_settings: { ...voice_settings, plan: profile.plan },
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
      // Delete history record if upload fails
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

    // Deduct words ONLY after successful generation
    const { error: deductError } = await supabaseService.rpc('deduct_words_smartly', {
      user_id_param: user.id,
      words_to_deduct: actualWordCount
    });

    if (deductError) {
      console.error("Failed to deduct words:", deductError);
    }

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
    
    */

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
