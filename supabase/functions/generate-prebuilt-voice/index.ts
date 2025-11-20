import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

// =====================================
// CONFIGURATION
// =====================================

const STORAGE_BUCKET = "user-prebuilt";
const SAMPLE_MP3_URL = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";

interface TTSConfig {
  sample_text: string;
  stability?: number;
  similarity_boost?: number;
  style?: number;
  use_speaker_boost?: boolean;
  language?: string;
}

interface PrebuiltVoice {
  id: string;
  voice_id: string;
  name: string;
  description: string;
  category: string;
  gender: string | null;
  accent: string | null;
  language: string;
  audio_preview_url: string | null;
  tts_config: TTSConfig;
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(req);
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
    const { voice_id, batch_generate } = body;

    // ===================================
    // BATCH GENERATION MODE
    // ===================================
    if (batch_generate === true) {
      console.log("🚀 Starting batch generation for all prebuilt voices");

      const { data: allVoices, error: fetchError } = await supabaseService
        .from("prebuilt_voices")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (fetchError) throw new Error(`Failed to fetch prebuilt voices: ${fetchError.message}`);

      if (!allVoices || allVoices.length === 0) {
        return new Response(
          JSON.stringify({ success: true, message: "No active voices to process", processed: 0 }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }

      const results = [];
      let processed = 0, skipped = 0, failed = 0;

      for (const voice of allVoices) {
        try {
          if (voice.audio_preview_url) {
            console.log(`⏭️ Skipping ${voice.voice_id} - already has preview`);
            skipped++;
            continue;
          }

          console.log(`🎙️ Processing ${voice.voice_id} (${voice.name})`);

          // Get tts_config from database (stored but not used for now)
          const ttsConfig: TTSConfig = voice.tts_config || {
            sample_text: "Hello, this is a sample voice preview.",
            stability: 0.5,
            similarity_boost: 0.75,
          };

          console.log(`📝 Voice config:`, ttsConfig);

          // Fetch sample MP3
          const response = await fetch(SAMPLE_MP3_URL);
          if (!response.ok) throw new Error("Failed to fetch sample audio");

          const mp3Data = new Uint8Array(await response.arrayBuffer());

          // Upload to storage
          const filePath = `prebuilt-previews/${voice.voice_id}.mp3`;
          const { error: uploadError } = await supabaseService.storage
            .from(STORAGE_BUCKET)
            .upload(filePath, mp3Data, {
              contentType: "audio/mpeg",
              upsert: true,
              cacheControl: "3600",
            });

          if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

          const { data: { publicUrl } } = supabaseService.storage
            .from(STORAGE_BUCKET)
            .getPublicUrl(filePath);

          // Update database with preview URL
          const { error: updateError } = await supabaseService
            .from("prebuilt_voices")
            .update({
              audio_preview_url: publicUrl,
              updated_at: new Date().toISOString(),
            })
            .eq("voice_id", voice.voice_id);

          if (updateError) throw new Error(`Update failed: ${updateError.message}`);

          results.push({
            voice_id: voice.voice_id,
            success: true,
            audio_url: publicUrl,
            config: ttsConfig
          });
          processed++;
        } catch (error) {
          console.error(`❌ Failed to process ${voice.voice_id}:`, error.message);
          results.push({ voice_id: voice.voice_id, success: false, error: error.message });
          failed++;
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          batch: true,
          total: allVoices.length,
          processed,
          skipped,
          failed,
          results,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // ===================================
    // SINGLE VOICE GENERATION MODE
    // ===================================
    if (!voice_id) {
      throw new Error("voice_id is required (or use batch_generate: true)");
    }

    console.log(`🎤 Generating prebuilt voice sample for voice_id: ${voice_id}`);

    // Fetch voice data with tts_config from database
    const { data: voiceData, error: fetchError } = await supabaseService
      .from("prebuilt_voices")
      .select("*")
      .eq("voice_id", voice_id)
      .single();

    if (fetchError) throw new Error(`Voice not found: ${fetchError.message}`);

    // Check if preview already exists
    if (voiceData?.audio_preview_url) {
      console.log(`✅ Using cached preview for ${voice_id}`);
      return new Response(
        JSON.stringify({
          success: true,
          audio_url: voiceData.audio_preview_url,
          cached: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Get TTS config from database (stored for future use)
    const ttsConfig: TTSConfig = voiceData.tts_config || {
      sample_text: "Hello, this is a sample voice preview.",
      stability: 0.5,
      similarity_boost: 0.75,
    };

    console.log(`📝 Using TTS config:`, ttsConfig);

    // Fetch sample MP3
    const response = await fetch(SAMPLE_MP3_URL);
    if (!response.ok) throw new Error("Failed to fetch sample audio");

    const mp3Data = new Uint8Array(await response.arrayBuffer());

    // Upload to storage
    const filePath = `prebuilt-previews/${voice_id}.mp3`;
    const { error: uploadError } = await supabaseService.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, mp3Data, {
        contentType: "audio/mpeg",
        upsert: true,
        cacheControl: "3600",
      });

    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

    const { data: { publicUrl } } = supabaseService.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filePath);

    // Update database with preview URL
    const { error: updateError } = await supabaseService
      .from("prebuilt_voices")
      .update({
        audio_preview_url: publicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("voice_id", voice_id);

    if (updateError) {
      console.error("Failed to update prebuilt voice:", updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        audio_url: publicUrl,
        cached: false,
        config: ttsConfig,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("❌ Prebuilt voice generation error:", error.message);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});