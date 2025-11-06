import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

// Sanitize input text (sample - limited length)
const sanitizeText = (text: string): string => {
  if (typeof text !== "string") return "";
  return text.replace(/[<>]/g, "").trim().slice(0, 10000); // Limit length for samples
};

// Validate voice settings (basic)
const validateVoiceSettings = (settings: any): boolean => {
  if (!settings || typeof settings !== "object") return false;
  if (!settings.voice_id || typeof settings.voice_id !== "string") return false;
  if (!settings.voice_type || typeof settings.voice_type !== "string") return false;
  if (!settings.language || typeof settings.language !== "string") return false;

  // Optional numeric checks (if present)
  if (typeof settings.speed === "number" && (settings.speed < 0.5 || settings.speed > 2.0)) return false;
  if (typeof settings.volume === "number" && (settings.volume < 0.1 || settings.volume > 1.5)) return false;
  if (typeof settings.pitch === "number" && (settings.pitch < 0.5 || settings.pitch > 2.0)) return false;
  if (typeof settings.stability === "number" && (settings.stability < 0.0 || settings.stability > 1.0)) return false;
  if (typeof settings.similarity_boost === "number" && (settings.similarity_boost < 0.0 || settings.similarity_boost > 1.0)) return false;

  return true;
};

const createErrorResponse = (message: string, status = 400) => {
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

/**
 * countWordsSafe
 * - Normalizes whitespace
 * - Splits on whitespace
 * - Applies 45-character chunk rule: a very long token counts as Math.ceil(len/45)
 * - Has fallbacks to regex and simple splitting in case of unusual input
 */
function countWordsSafe(text: string): number {
  if (!text || typeof text !== "string") return 0;
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length === 0) return 0;

  try {
    const tokens = clean.split(/\s+/).filter(Boolean);
    let total = 0;
    for (const t of tokens) {
      total += t.length > 45 ? Math.ceil(t.length / 45) : 1;
    }

    // Fallback: regex word extraction if total is unexpectedly zero
    if (total === 0) {
      const matches = clean.match(/\p{L}[\p{L}\p{M}\p{N}_'-]*/gu); // better Unicode-aware word-ish matches
      if (matches && matches.length) {
        total = matches.reduce((acc, w) => acc + (w.length > 45 ? Math.ceil(w.length / 45) : 1), 0);
      }
    }

    // Final fallback: split by space only
    if (total === 0) {
      const approx = clean.split(" ").filter(Boolean);
      total = approx.length;
    }

    return Math.max(0, total);
  } catch (err) {
    console.error("countWordsSafe fallback triggered:", err);
    const approx = clean.split(" ").filter(Boolean);
    let total = 0;
    for (const t of approx) {
      total += t.length > 45 ? Math.ceil(t.length / 45) : 1;
    }
    return total;
  }
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
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

    // Parse body
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

    // Word counting (45-char chunk rule)
    const actualWordCount = countWordsSafe(sanitizedText);
    const providedWordCount = typeof body.word_count === "number" ? body.word_count : undefined;

    if (providedWordCount !== undefined && Math.abs(actualWordCount - providedWordCount) > 5) {
      console.warn(`Word count mismatch: provided=${providedWordCount}, actual=${actualWordCount}`);
    }

    // Sample constraints
    if (actualWordCount > 100) {
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
      word_count: actualWordCount,
      voice_type: body.voice_settings.voice_type,
      voice_id: body.voice_settings.voice_id,
      language: body.language,
      is_sample: !!body.is_sample
    });

    console.log("Voice settings:", JSON.stringify(body.voice_settings, null, 2));

    // TODO: Replace this with an actual TTS call when ready
    const SAMPLE_MP3_URL = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";

    // No deduction for samples
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
    return createErrorResponse(err?.message || "An internal server error occurred", 500);
  }
});
