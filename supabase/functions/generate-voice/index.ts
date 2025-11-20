import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey"
};

const SAMPLE_MP3_URL = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";

/* -------------------- UTILITIES -------------------- */

// Sanitize input text
const sanitizeText = (text: string) => {
  if (typeof text !== "string") return "";
  return text.replace(/[<>]/g, "").trim().slice(0, 500000); // max 500k chars
};

// Sanitize title safely
const sanitizeTitle = (title: string) => {
  if (typeof title !== "string") return "Untitled";
  return title.replace(/[<>\"']/g, "").trim().slice(0, 200);
};

// Validate voice settings
const validateVoiceSettings = (settings: any) => {
  if (!settings || typeof settings !== "object") return false;
  if (!settings.voice_id || !settings.voice_type || !settings.language) return false;
  if (!["record", "prebuilt", "history"].includes(settings.voice_type)) return false;

  const numericChecks = [
    ["speed", 0.5, 2.0],
    ["volume", 0.1, 1.5],
    ["pitch", 0.5, 2.0],
    ["stability", 0.0, 1.0],
    ["similarity_boost", 0.0, 1.0]
  ];

  for (const [key, min, max] of numericChecks) {
    const value = settings[key];
    if (typeof value === "number" && (value < (min as number) || value > (max as number))) {
      return false;
    }
  }
  return true;
};

// Generate unique readable name (IST-based)
function generateUniqueVoiceName() {
  const istDate = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
  const d = new Date(istDate);
  const randomCode = Array.from({ length: 4 }, () =>
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"[
      Math.floor(Math.random() * 62)
    ]
  ).join("");
  const dateStr = `${d.getDate().toString().padStart(2, "0")}${(d.getMonth() + 1)
    .toString()
    .padStart(2, "0")}${d.getFullYear().toString().slice(-2)}`;
  const timeStr = `${d.getHours().toString().padStart(2, "0")}${d
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
  return `Generated_${randomCode}_${dateStr}_${timeStr}_Voice`;
}

/* -------------------- MAIN FUNCTION -------------------- */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Env validation
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) {
      throw new Error("Missing Supabase environment variables");
    }

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    });

    const {
      data: { user },
      error: authError
    } = await supabaseClient.auth.getUser();

    if (authError || !user) throw new Error("User not authenticated");

    const supabaseService = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false }
    });

    // Parse JSON
    let body;
    try {
      body = await req.json();
    } catch {
      throw new Error("Invalid JSON in request body");
    }

    // Field validation
    if (!body.text || !body.title || !body.voice_settings || !body.language)
      throw new Error("Missing required fields");
    if (!validateVoiceSettings(body.voice_settings))
      throw new Error("Invalid voice settings format");

    const sanitizedText = sanitizeText(body.text);
    const sanitizedTitle = sanitizeTitle(body.title);
    if (!sanitizedText) throw new Error("Text content is empty after sanitization");

    // ✅ Use only provided word count
    const wordsToUse =
      typeof body.word_count === "number" && body.word_count > 0 ? body.word_count : 0;
    if (wordsToUse === 0) throw new Error("Invalid or missing word count");
    if (wordsToUse > 100000) throw new Error("Text exceeds maximum limit of 100,000 words");

    // Log request
    console.log("Voice generation request:", {
      user_id: user.id,
      words: wordsToUse,
      voice_type: body.voice_settings.voice_type,
      voice_id: body.voice_settings.voice_id,
      language: body.language
    });

    // Fetch profile
    const { data: profile, error: profileError } = await supabaseService
      .from("profiles")
      .select("plan, words_limit, plan_words_used, word_balance")
      .eq("user_id", user.id)
      .single();
    if (profileError) throw new Error("User profile not found");

    const planWordsAvailable = Math.max(0, (profile.words_limit || 0) - (profile.plan_words_used || 0));
    const purchasedWords = profile.word_balance || 0;
    const totalWordsAvailable = planWordsAvailable + purchasedWords;

    if (wordsToUse > totalWordsAvailable)
      throw new Error(`Insufficient word balance. Need ${wordsToUse}, have ${totalWordsAvailable}`);

    // Plan retention
    const planAtCreation = profile?.plan || "free";
    const retentionDays = planAtCreation === "premium" ? 90 : planAtCreation === "pro" ? 30 : 7;
    const retentionExpiresAt = new Date(Date.now() + retentionDays * 86400000).toISOString();

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

    if (historyError) throw new Error(`Failed to create history record: ${historyError.message}`);

    // Fetch sample audio (TEMP)
    const response = await fetch(SAMPLE_MP3_URL);
    if (!response.ok) throw new Error("Failed to fetch sample MP3");

    const mp3Data = new Uint8Array(await response.arrayBuffer());
    if (mp3Data.length > 100 * 1024 * 1024)
      throw new Error("Generated audio file too large");

    // Upload to Supabase Storage
    const voiceName = generateUniqueVoiceName();
    const filePath = `${user.id}/${voiceName}.mp3`;
    const { error: uploadError } = await supabaseService.storage
      .from("user-generates")
      .upload(filePath, mp3Data, { contentType: "audio/mpeg", upsert: true });

    if (uploadError) throw new Error(`Failed to upload MP3: ${uploadError.message}`);

    // Update history record
    const generationCompletedAt = new Date();
    const processingTimeMs =
      generationCompletedAt.getTime() -
      new Date(historyRecord.generation_started_at).getTime();
    const durationSeconds = Math.max(1, Math.round(wordsToUse / 150 * 60));

    await supabaseService
      .from("history")
      .update({
        audio_url: filePath,
        generation_completed_at: generationCompletedAt.toISOString(),
        processing_time_ms: processingTimeMs,
        duration_seconds: durationSeconds
      })
      .eq("id", historyRecord.id);

    // Deduct words smartly
    const { error: deductError } = await supabaseService.rpc("deduct_words_smartly", {
      user_id_param: user.id,
      words_to_deduct: wordsToUse
    });
    if (deductError) console.error(`Word deduction failed: ${deductError.message}`);

    // Generate temp stream token
    const token = crypto.randomUUID().replace(/-/g, "");
    const expiresAt = new Date(Date.now() + 86400000).toISOString();

    await supabaseService.from("audio_access_tokens").insert({
      user_id: user.id,
      bucket: "user-generates",
      storage_path: filePath,
      token,
      expires_at: expiresAt
    });

    const streamUrl = `${SUPABASE_URL}/functions/v1/stream-audio?token=${token}`;

    console.log(`✅ Voice generation completed for user ${user.id} (${wordsToUse} words)`);

    return new Response(
      JSON.stringify({
        success: true,
        audio_url: streamUrl,
        storage_path: filePath,
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
  } catch (error: unknown) {
    console.error("Generation function error:", (error as Error).message);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message || "Internal server error" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500
      }
    );
  }
});
