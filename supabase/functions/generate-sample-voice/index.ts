import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

// Sanitize input text (sample - limited length)
const sanitizeText = (text: string): string => {
  if (typeof text !== "string") return "";
  return text.replace(/[<>]/g, "").trim().slice(0, 10000); // Limit length for samples
};

// Validate voice settings (basic)
const validateVoiceSettings = (settings: any): boolean => {
  if (!settings || typeof settings !== "object") return false;
  if (!settings.voice_id || typeof settings.voice_id !== "string") return false;
  if (!settings.voice_type || typeof settings.voice_type !== "string")
    return false;
  if (!settings.language || typeof settings.language !== "string") return false;

  // Optional numeric checks (if present)
  if (
    typeof settings.speed === "number" &&
    (settings.speed < 0.5 || settings.speed > 2.0)
  )
    return false;
  if (
    typeof settings.volume === "number" &&
    (settings.volume < 0.1 || settings.volume > 1.5)
  )
    return false;
  if (
    typeof settings.pitch === "number" &&
    (settings.pitch < 0.5 || settings.pitch > 2.0)
  )
    return false;
  if (
    typeof settings.stability === "number" &&
    (settings.stability < 0.0 || settings.stability > 1.0)
  )
    return false;
  if (
    typeof settings.similarity_boost === "number" &&
    (settings.similarity_boost < 0.0 || settings.similarity_boost > 1.0)
  )
    return false;

  return true;
};

// Common error response helper
const createErrorResponse = (message: string, corsHeaders: Record<string, string>, status = 400) => {
  return new Response(
    JSON.stringify({
      success: false,
      error: message
    }),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status
    }
  );
};

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(req);
  }

  try {
    // Env validation
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return createErrorResponse("Missing Supabase environment variables", 500);
    }

    // Auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return createErrorResponse("Missing authorization header", 401);
    }

    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data, error: authError } = await supabaseClient.auth.getUser();
    const user = data?.user ?? null;
    if (authError || !user) {
      return createErrorResponse("User not authenticated", 401);
    }

    // Parse JSON body
    let body: any;
    try {
      body = await req.json();
    } catch (e) {
      return createErrorResponse("Invalid JSON in request body", 400);
    }

    // Required fields
    if (!body.text || typeof body.text !== "string") {
      return createErrorResponse("Invalid or missing 'text' field", 400);
    }
    if (!body.voice_settings || typeof body.voice_settings !== "object") {
      return createErrorResponse("Invalid or missing 'voice_settings' field", 400);
    }
    if (!body.language || typeof body.language !== "string") {
      return createErrorResponse("Invalid or missing 'language' field", 400);
    }

    // Validate voice settings
    if (!validateVoiceSettings(body.voice_settings)) {
      return createErrorResponse("Invalid voice settings format", 400);
    }

    // Sanitize text
    const sanitizedText = sanitizeText(body.text);
    if (!sanitizedText) {
      return createErrorResponse("Text content is empty after sanitization", 400);
    }

    // ✅ Only use provided word count
    const providedWordCount =
      typeof body.word_count === "number"
        ? Math.max(0, Math.floor(body.word_count))
        : 0;

    if (providedWordCount === 0) {
      return createErrorResponse("Missing or invalid 'word_count' value", 400);
    }

    if (providedWordCount > 100) {
      return createErrorResponse("Sample text exceeds 100 word limit", 400);
    }

    // Voice ID format validation
    const voiceIdPattern = /^[a-zA-Z0-9_-]{1,100}$/;
    if (!voiceIdPattern.test(body.voice_settings.voice_id)) {
      return createErrorResponse("Invalid voice ID format", 400);
    }

    // Logging for debugging / monitoring
    console.log("Sample generation request:", {
      user_id: user.id,
      provided_word_count: providedWordCount,
      voice_type: body.voice_settings.voice_type,
      voice_id: body.voice_settings.voice_id,
      language: body.language,
      is_sample: !!body.is_sample
    });

    console.log("Voice settings:", JSON.stringify(body.voice_settings, null, 2));

    // Mock sample audio (replace with real TTS when ready)
    const SAMPLE_MP3_URL =
      "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";

    // No deduction for samples
    console.log(
      `Sample generation completed for user ${user.id} - ${providedWordCount} words (No deduction)`
    );

    return new Response(
      JSON.stringify({
        success: true,
        audio_url: SAMPLE_MP3_URL,
        voice_id_used: body.voice_settings.voice_id,
        voice_type: body.voice_settings.voice_type,
        word_count: providedWordCount,
        is_sample: true,
        message: "Sample generated successfully - No words deducted"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      }
    );
  } catch (err: any) {
    console.error("Sample generation function error:", err);
    return createErrorResponse(err?.message || "An internal server error occurred", 500);
  }
});
