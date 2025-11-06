import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey"
};

const SAMPLE_MP3_URL = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";

// Security: Input sanitization
const sanitizeText = (text: string): string => {
  if (typeof text !== 'string') return '';
  return text
    .replace(/[<>]/g, '') // Remove potential HTML
    .trim()
    .slice(0, 500000); // Max 500k characters
};

const sanitizeTitle = (title: string): string => {
  if (typeof title !== 'string') return 'Untitled';
  return title
    .replace(/[<>\"']/g, '')
    .trim()
    .slice(0, 200);
};

// Security: Validate voice settings
const validateVoiceSettings = (settings: any): boolean => {
  if (!settings || typeof settings !== 'object') return false;

  // Required fields
  if (!settings.voice_id || typeof settings.voice_id !== 'string') return false;
  if (!settings.voice_type || typeof settings.voice_type !== 'string') return false;
  if (!settings.language || typeof settings.language !== 'string') return false;

  // Validate voice_type enum
  if (!['record', 'prebuilt', 'history'].includes(settings.voice_type)) return false;

  // Validate numeric ranges
  if (typeof settings.speed === 'number' && (settings.speed < 0.5 || settings.speed > 2.0)) return false;
  if (typeof settings.volume === 'number' && (settings.volume < 0.1 || settings.volume > 1.5)) return false;
  if (typeof settings.pitch === 'number' && (settings.pitch < 0.5 || settings.pitch > 2.0)) return false;
  if (typeof settings.stability === 'number' && (settings.stability < 0.0 || settings.stability > 1.0)) return false;
  if (typeof settings.similarity_boost === 'number' && (settings.similarity_boost < 0.0 || settings.similarity_boost > 1.0)) return false;

  return true;
};

// Generate unique + readable file name
function generateUniqueVoiceName(): string {
  const istDate = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
  const d = new Date(istDate);

  // Random 4-character alphanumeric
  const randomCode = Array.from({ length: 4 }, () =>
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"[
      Math.floor(Math.random() * 62)
    ]
  ).join("");

  // Date: DDMMYY
  const dateStr = `${d.getDate().toString().padStart(2, "0")}${(d.getMonth() + 1)
    .toString()
    .padStart(2, "0")}${d.getFullYear().toString().slice(-2)}`;

  // Time: HHMM
  const timeStr = `${d.getHours().toString().padStart(2, "0")}${d
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;

  return `Generated_${randomCode}_${dateStr}_${timeStr}_Voice`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Security: Validate environment variables
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) {
      throw new Error("Missing Supabase environment variables");
    }

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
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
      throw new Error("User not authenticated");
    }

    // Use service role for database operations
    const supabaseService = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: { persistSession: false }
      }
    );

    // Parse and validate request body
    let body;
    try {
      body = await req.json();
    } catch (e) {
      throw new Error("Invalid JSON in request body");
    }

    // Security: Validate required fields
    if (!body.text || typeof body.text !== 'string') {
      throw new Error("Invalid or missing 'text' field");
    }

    if (!body.title || typeof body.title !== 'string') {
      throw new Error("Invalid or missing 'title' field");
    }

    if (!body.voice_settings || typeof body.voice_settings !== 'object') {
      throw new Error("Invalid or missing 'voice_settings' field");
    }

    if (!body.language || typeof body.language !== 'string') {
      throw new Error("Invalid or missing 'language' field");
    }

    // Security: Validate voice settings
    if (!validateVoiceSettings(body.voice_settings)) {
      throw new Error("Invalid voice settings format");
    }

    // Security: Sanitize inputs
    const sanitizedText = sanitizeText(body.text);
    const sanitizedTitle = sanitizeTitle(body.title);

    if (!sanitizedText) {
      throw new Error("Text content is empty after sanitization");
    }

    // Security: Calculate actual word count from sanitized text
    const actualWordCount = sanitizedText.split(/\s+/).filter(Boolean).length;
    const providedWordCount = body.word_count;

    // Verify word count matches (allow small variance)
    if (providedWordCount && Math.abs(actualWordCount - providedWordCount) > 10) {
      console.warn(`Word count mismatch: provided=${providedWordCount}, actual=${actualWordCount}`);
    }

    // Security: Validate word count limits
    if (actualWordCount === 0) {
      throw new Error("Text contains no words");
    }

    if (actualWordCount > 100000) {
      throw new Error("Text exceeds maximum limit of 100,000 words");
    }

    // Use actual word count for all operations
    const wordsToUse = actualWordCount;

    // Log generation request
    console.log(`Voice generation request:`, {
      user_id: user.id,
      word_count: wordsToUse,
      voice_type: body.voice_settings.voice_type,
      voice_id: body.voice_settings.voice_id,
      language: body.language
    });

    // Check user's word balance
    const { data: profile, error: profileError } = await supabaseService
      .from("profiles")
      .select("plan, words_limit, plan_words_used, word_balance")
      .eq("user_id", user.id)
      .single();

    if (profileError) {
      throw new Error("User profile not found");
    }

    // Calculate available words
    const planWordsAvailable = Math.max(0, (profile.words_limit || 0) - (profile.plan_words_used || 0));
    const purchasedWords = profile.word_balance || 0;
    const totalWordsAvailable = planWordsAvailable + purchasedWords;

    // Security: Check word balance
    if (wordsToUse > totalWordsAvailable) {
      throw new Error(
        `Insufficient word balance. Need ${wordsToUse}, but have ${totalWordsAvailable}`
      );
    }

    // Calculate retention period based on plan
    const planAtCreation = profile?.plan || "free";
    const retentionDays =
      planAtCreation === "premium" ? 90 :
      planAtCreation === "pro" ? 30 : 7;

    const retentionExpiresAt = new Date(
      Date.now() + retentionDays * 24 * 60 * 60 * 1000
    ).toISOString();

    // Create history record
    const generationStartedAt = new Date().toISOString();

    const { data: historyRecord, error: historyError } = await supabaseService
      .from("history")
      .insert({
        user_id: user.id,
        title: sanitizedTitle,
        original_text: sanitizedText,
        voice_settings: body.voice_settings,
        words_used: wordsToUse,
        generation_started_at: generationStartedAt,
        language: body.language,
        plan_at_creation: planAtCreation,
        retention_expires_at: retentionExpiresAt
      })
      .select("id, generation_started_at")
      .single();

    if (historyError) {
      throw new Error(`Failed to create history record: ${historyError.message}`);
    }

    // TODO: Replace with actual TTS API call
    // Fetch sample audio (temporary)
    const response = await fetch(SAMPLE_MP3_URL);
    if (!response.ok) {
      throw new Error("Failed to fetch sample MP3");
    }

    const mp3Data = new Uint8Array(await response.arrayBuffer());

    // Security: Validate file size (max 100MB for safety)
    if (mp3Data.length > 100 * 1024 * 1024) {
      throw new Error("Generated audio file too large");
    }

    // Generate unique readable name
    const voiceName = generateUniqueVoiceName();
    const filePath = `${user.id}/${voiceName}.mp3`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabaseService.storage
      .from("user-generates")
      .upload(filePath, mp3Data, {
        contentType: "audio/mpeg",
        upsert: true
      });

    if (uploadError) {
      throw new Error(`Failed to upload MP3: ${uploadError.message}`);
    }

    const storagePath = filePath;

    // Update history record with completion info
    const generationCompletedAt = new Date();
    const processingTimeMs =
      generationCompletedAt.getTime() - new Date(historyRecord.generation_started_at).getTime();

    // Calculate duration (estimated: 150 words per minute)
    const durationSeconds = Math.max(1, Math.round((wordsToUse / 150) * 60));

    const { error: updateError } = await supabaseService
      .from("history")
      .update({
        audio_url: storagePath,
        generation_completed_at: generationCompletedAt.toISOString(),
        processing_time_ms: processingTimeMs,
        duration_seconds: durationSeconds
      })
      .eq("id", historyRecord.id);

    if (updateError) {
      console.error(`Failed to update history record:`, updateError.message);
    }

    // Deduct words using smart deduction
    const { error: deductError } = await supabaseService.rpc("deduct_words_smartly", {
      user_id_param: user.id,
      words_to_deduct: wordsToUse
    });

    if (deductError) {
      console.error(`Word deduction failed:`, deductError.message);
      // Don't throw - audio is already generated
    }

    // Create temp token for stream access
    const token = crypto.randomUUID().replace(/-/g, "");
    const expiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString();

    await supabaseService.from("audio_access_tokens").insert({
      user_id: user.id,
      bucket: "user-generates",
      storage_path: storagePath,
      token,
      expires_at: expiresAt
    });

    const streamUrl = `${SUPABASE_URL}/functions/v1/stream-audio?token=${token}`;

    console.log(`Voice generation completed for user ${user.id} - ${wordsToUse} words deducted`);

    return new Response(
      JSON.stringify({
        success: true,
        audio_url: streamUrl,
        storage_path: storagePath,
        history_id: historyRecord.id,
        title: sanitizedTitle,
        words_used: wordsToUse,
        duration_seconds: durationSeconds,
        processing_time_ms: processingTimeMs
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      }
    );

  } catch (error: any) {
    console.error("Generation function error:", error.message);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "An internal server error occurred"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500
      }
    );
  }
});