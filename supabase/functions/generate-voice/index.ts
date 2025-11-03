import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SAMPLE_MP3_URL = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";

/** 🧩 Helper — Generate unique + readable file name */
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) {
      throw new Error("Missing Supabase environment variables.");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header.");

    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();
    if (!user) throw new Error("User not authenticated.");

    const supabaseService = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const body = await req.json();
    const { text, voice_settings, language } = body;

    if (!text || !voice_settings || !language) {
      throw new Error("Request body must include text, voice_settings, and language.");
    }

    // 🧾 Generate unique readable name
    const voiceName = generateUniqueVoiceName();

    // 🧮 Get user's previous generation count
    const { count, error: countError } = await supabaseService
      .from("history")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (countError) throw new Error("Failed to count previous generations.");

    const nextNumber = (count || 0) + 1;
    const title = `Audio Generation ${nextNumber}`; // 👈 Title with auto increment

    const actualWordCount = text.split(/\s+/).filter(Boolean).length;

    // Check user's word balance
    const { data: profile, error: profileError } = await supabaseService
      .from("profiles")
      .select("plan, words_limit, plan_words_used, word_balance")
      .eq("user_id", user.id)
      .single();

    if (profileError) throw new Error("User profile not found.");

    const totalWordsAvailable =
      (profile.words_limit || 0) -
      (profile.plan_words_used || 0) +
      (profile.word_balance || 0);

    if (actualWordCount > totalWordsAvailable) {
      throw new Error(
        `Insufficient word balance. Need ${actualWordCount}, but have ${totalWordsAvailable}.`
      );
    }

    const planAtCreation = profile?.plan || "free";
    const retentionDays =
      planAtCreation === "premium" ? 90 : planAtCreation === "pro" ? 30 : 7;
    const retentionExpiresAt = new Date(
      Date.now() + retentionDays * 24 * 60 * 60 * 1000
    ).toISOString();

    // Insert history record
    const { data: historyRecord, error: historyError } = await supabaseService
      .from("history")
      .insert({
        user_id: user.id,
        title,
        original_text: text,
        voice_settings,
        words_used: actualWordCount,
        generation_started_at: new Date().toISOString(),
        language,
        plan_at_creation: planAtCreation,
        retention_expires_at: retentionExpiresAt,
      })
      .select("id, generation_started_at")
      .single();

    if (historyError)
      throw new Error(`Failed to create history record: ${historyError.message}`);

    // 🔊 Fetch sample audio
    const response = await fetch(SAMPLE_MP3_URL);
    if (!response.ok) throw new Error("Failed to fetch sample MP3.");
    const mp3Data = new Uint8Array(await response.arrayBuffer());

    // 📁 File path → user_id/language/Generated_xxx_Voice.mp3
    const filePath = `${user.id}/${language}/${voiceName}.mp3`;

    const { error: uploadError } = await supabaseService.storage
      .from("user-generates")
      .upload(filePath, mp3Data, {
        contentType: "audio/mpeg",
        upsert: true,
      });

    if (uploadError) throw new Error(`Failed to upload MP3: ${uploadError.message}`);

    const generationCompletedAt = new Date();
    const processingTime =
      generationCompletedAt.getTime() -
      new Date(historyRecord.generation_started_at).getTime();

    // Update history record
    const { error: updateError } = await supabaseService
      .from("history")
      .update({
        audio_url: filePath,
        generation_completed_at: generationCompletedAt.toISOString(),
        processing_time_ms: processingTime,
        duration_seconds: Math.max(1, Math.round((actualWordCount / 150) * 60)),
        name: voiceName,
      })
      .eq("id", historyRecord.id);

    if (updateError)
      console.error(`Failed to update history record:`, updateError.message);

    // Deduct words
    const { error: deductError } = await supabaseService.rpc("deduct_words_smartly", {
      user_id_param: user.id,
      words_to_deduct: actualWordCount,
    });
    if (deductError) console.error(`Word deduction failed:`, deductError.message);

    // Temporary access token
    const token = crypto.randomUUID().replace(/-/g, "");
    const expiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    await supabaseService.from("audio_access_tokens").insert({
      user_id: user.id,
      bucket: "user-generates",
      storage_path: filePath,
      token,
      expires_at: expiresAt,
    });

    const streamUrl = `${SUPABASE_URL}/functions/v1/stream-audio?token=${token}`;

    return new Response(
      JSON.stringify({
        success: true,
        audio_url: streamUrl,
        storage_path: filePath,
        history_id: historyRecord.id,
        title, // 👈 shows "Audio Generation N"
        name: voiceName,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Generation function error:", error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
