import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SAMPLE_TEXTS = [
  "Hello! This is a sample of how your voice will sound with our advanced text-to-speech technology.",
  "Welcome to our voice generation platform. You can customize the voice settings to match your preferences.",
  "This is just a preview. The full version will give you complete control over tone, speed, and emotion.",
  "Test how different voices work with your content. Each voice has its unique character and personality.",
  "Experience high-quality speech synthesis with natural intonation and clear pronunciation."
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { voice_id = "21m00Tcm4TlvDq8ikWAM", voice_settings } = await req.json();
    
    // Get random sample text
    const sampleText = SAMPLE_TEXTS[Math.floor(Math.random() * SAMPLE_TEXTS.length)];

    // Generate voice using ElevenLabs
    const elevenlabsResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice_id}`, {
      method: "POST",
      headers: {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": Deno.env.get("ELEVENLABS_API_KEY") || "",
      },
      body: JSON.stringify({
        text: sampleText,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: voice_settings?.stability || 0.5,
          similarity_boost: voice_settings?.similarity_boost || 0.8,
          style: voice_settings?.style || 0.0,
          use_speaker_boost: voice_settings?.use_speaker_boost || true
        }
      })
    });

    if (!elevenlabsResponse.ok) {
      const errorText = await elevenlabsResponse.text();
      throw new Error(`Voice generation failed: ${errorText}`);
    }

    const audioBuffer = await elevenlabsResponse.arrayBuffer();
    const audioData = new Uint8Array(audioBuffer);

    // Create temporary storage with auto-cleanup
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const tempFileName = `samples/temp_${Date.now()}_${Math.random().toString(36).substring(7)}.mp3`;
    
    const { error: uploadError } = await supabaseService.storage
      .from("voice-recordings")
      .upload(tempFileName, audioData, {
        contentType: "audio/mpeg",
        duplex: "false"
      });

    if (uploadError) {
      console.error("Failed to upload sample audio:", uploadError);
      throw new Error("Failed to save sample audio");
    }

    // Get signed URL that expires in 10 minutes
    const { data: signedUrlData, error: urlError } = await supabaseService.storage
      .from("voice-recordings")
      .createSignedUrl(tempFileName, 600); // 10 minutes

    if (urlError) {
      console.error("Failed to create signed URL:", urlError);
      throw new Error("Failed to create audio URL");
    }

    // Schedule cleanup after 15 minutes
    setTimeout(async () => {
      try {
        await supabaseService.storage
          .from("voice-recordings")
          .remove([tempFileName]);
        console.log(`Cleaned up sample file: ${tempFileName}`);
      } catch (error) {
        console.error("Sample cleanup failed:", error);
      }
    }, 15 * 60 * 1000); // 15 minutes

    return new Response(JSON.stringify({
      success: true,
      audio_url: signedUrlData.signedUrl,
      sample_text: sampleText,
      voice_id: voice_id,
      expires_in_minutes: 10,
      voice_settings: voice_settings
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Sample voice generation error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});