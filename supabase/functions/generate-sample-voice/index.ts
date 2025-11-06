import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

// Security: Input sanitization
const sanitizeText = (text: string): string => {
  if (typeof text !== 'string') return '';
  return text
    .replace(/[<>]/g, '') // Remove HTML tags
    .trim()
    .slice(0, 10000); // Limit length for samples
};

// Security: Validate voice settings
const validateVoiceSettings = (settings: any): boolean => {
  if (!settings || typeof settings !== 'object') return false;

  // Required fields
  if (!settings.voice_id || typeof settings.voice_id !== 'string') return false;
  if (!settings.voice_type || typeof settings.voice_type !== 'string') return false;
  if (!settings.language || typeof settings.language !== 'string') return false;

  // Validate numeric ranges
  if (typeof settings.speed === 'number' && (settings.speed < 0.5 || settings.speed > 2.0)) return false;
  if (typeof settings.volume === 'number' && (settings.volume < 0.1 || settings.volume > 1.5)) return false;
  if (typeof settings.pitch === 'number' && (settings.pitch < 0.5 || settings.pitch > 2.0)) return false;

  return true;
};

const createErrorResponse = (message: string, status: number) => {
  console.error(`Error [${status}]:`, message);
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
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Security: Validate environment variables
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error("Missing Supabase environment variables");
    }

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return createErrorResponse("Missing authorization header", 401);
    }

    const supabaseClient = createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
      {
        global: {
          headers: { Authorization: authHeader }
        }
      }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return createErrorResponse("User not authenticated", 401);
    }

    // Parse and validate request body
    let body;
    try {
      body = await req.json();
    } catch (e) {
      return createErrorResponse("Invalid JSON in request body", 400);
    }

    // Security: Validate required fields
    if (!body.text || typeof body.text !== 'string') {
      return createErrorResponse("Invalid or missing 'text' field", 400);
    }

    if (!body.voice_settings || typeof body.voice_settings !== 'object') {
      return createErrorResponse("Invalid or missing 'voice_settings' field", 400);
    }

    if (!body.language || typeof body.language !== 'string') {
      return createErrorResponse("Invalid or missing 'language' field", 400);
    }

    // Security: Validate voice settings
    if (!validateVoiceSettings(body.voice_settings)) {
      return createErrorResponse("Invalid voice settings format", 400);
    }

    // Security: Sanitize text input
    const sanitizedText = sanitizeText(body.text);
    if (!sanitizedText) {
      return createErrorResponse("Text content is empty after sanitization", 400);
    }

    // Security: Calculate and validate word count
    const actualWordCount = sanitizedText.split(/\s+/).filter(Boolean).length;
    const providedWordCount = body.word_count;

    // Verify word count matches (allow small variance for edge cases)
    if (providedWordCount && Math.abs(actualWordCount - providedWordCount) > 5) {
      console.warn(`Word count mismatch: provided=${providedWordCount}, actual=${actualWordCount}`);
    }

    // Security: Limit sample to 100 words max
    if (actualWordCount > 100) {
      return createErrorResponse("Sample text exceeds 100 word limit", 400);
    }

    // Log generation request (for monitoring)
    console.log(`Sample generation request:`, {
      user_id: user.id,
      word_count: actualWordCount,
      voice_type: body.voice_settings.voice_type,
      voice_id: body.voice_settings.voice_id,
      language: body.language,
      is_sample: body.is_sample
    });

    // ✅ Voice settings received - log for verification
    console.log("Voice settings:", JSON.stringify(body.voice_settings, null, 2));
    console.log("Voice ID:", body.voice_settings.voice_id);
    console.log("Voice Type:", body.voice_settings.voice_type);

    // Security: Validate voice_id format (UUID or custom format)
    const voiceIdPattern = /^[a-zA-Z0-9_-]{1,100}$/;
    if (!voiceIdPattern.test(body.voice_settings.voice_id)) {
      return createErrorResponse("Invalid voice ID format", 400);
    }

    // TODO: Replace with actual TTS API call
    // For now, return a sample MP3 URL
    const SAMPLE_MP3_URL = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";

    // Security: No word deduction for samples
    console.log(`Sample generation completed for user ${user.id} - No words deducted`);

    return new Response(
      JSON.stringify({
        success: true,
        audio_url: SAMPLE_MP3_URL,
        voice_id_used: body.voice_settings.voice_id,
        voice_type: body.voice_settings.voice_type,
        word_count: actualWordCount,
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
    return createErrorResponse(
      err.message || "An internal server error occurred",
      500
    );
  }
});