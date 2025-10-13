import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import { parseBuffer } from "npm:music-metadata-browser";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SAMPLE_MP3_URL = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    console.log("Request received");

    // --- Supabase environment variables ---
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing Supabase environment variables");
    }

    // --- Supabase clients ---
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const supabaseService = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // --- Authenticate user ---
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) throw new Error("User not authenticated");

    const { data: authData, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError) throw authError;

    const user = authData.user;
    if (!user) throw new Error("User not authenticated");
    console.log("User authenticated:", user.id);

    // --- Parse request body ---
    const body = await req.json();
    const { text, title, sampleText } = body;
    if (!text || !title) throw new Error("Text and title are required");

    const actualWordCount = text.split(/\s+/).filter((w) => w.length > 0).length;
    console.log("Word count:", actualWordCount);

    // --- Fetch user profile ---
    const { data: profile } = await supabaseService
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!profile) throw new Error("User profile not found");

    const totalWordsAvailable =
      (profile.words_limit || 0) - (profile.plan_words_used || 0) + (profile.word_balance || 0);

    if (actualWordCount > totalWordsAvailable) {
      throw new Error(
        `Insufficient word balance. Need ${actualWordCount} words but only ${totalWordsAvailable} available.`
      );
    }

    // --- Create history record ---
    const { data: historyRecord, error: historyError } = await supabaseService
      .from("history")
      .insert({
        user_id: user.id,
        title,
        original_text: text,
        voice_settings: {
          plan: profile.plan,
          sampleText,
        },
        words_used: actualWordCount,
        generation_started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (historyError || !historyRecord) throw new Error("Failed to create history record");
    console.log("History record created:", historyRecord.id);

    // --- Fetch MP3 from remote URL ---
    const response = await fetch(SAMPLE_MP3_URL);
    if (!response.ok) throw new Error(`Failed to fetch sample MP3: ${response.statusText}`);

    const mp3Data = new Uint8Array(await response.arrayBuffer());
    console.log("MP3 fetched, bytes:", mp3Data.length);

    // --- Upload to Supabase storage ---
    const safeFileName = `${user.id}/${historyRecord.id}.mp3`.replace(/[^a-zA-Z0-9_\-/.]/g, "_");

    const { error: uploadError } = await supabaseService
      .storage.from("user-generates")
      .upload(safeFileName, mp3Data, { contentType: "audio/mpeg", upsert: true });

    if (uploadError) throw new Error(`Failed to upload MP3: ${uploadError.message}`);

    // --- Get public URL ---
    const { data: urlData } = supabaseService.storage.from("user-generates").getPublicUrl(safeFileName);
    const publicUrl = urlData?.publicUrl;
    if (!publicUrl) throw new Error("Public URL not found");
    console.log("Public URL:", publicUrl);

    // --- Parse MP3 duration safely (optional) ---
    let durationSeconds = 0;
    try {
      const metadata = await parseBuffer(mp3Data, "audio/mpeg");
      durationSeconds = metadata.format.duration || 0;
    } catch (e) {
      console.warn("MP3 duration parsing failed, defaulting to 0:", e);
    }

    // --- Update history record ---
    const generationCompleted = new Date();
    const { data: updatedRecord, error: updateError } = await supabaseService
      .from("history")
      .update({
        audio_url: publicUrl,
        generation_completed_at: generationCompleted.toISOString(),
        processing_time_ms: generationCompleted.getTime() - new Date(historyRecord.generation_started_at).getTime(),
      })
      .eq("id", historyRecord.id)
      .select()
      .single();

    if (updateError) throw new Error(`Failed to update history: ${updateError.message}`);
    console.log("History updated successfully");

    // --- Deduct words using RPC ---
    const { error: deductError } = await supabaseService.rpc("deduct_words_smartly", {
      user_id_param: user.id,
      words_to_deduct: actualWordCount,
    });
    if (deductError) console.error("Word deduction failed:", deductError);

    // --- Success response ---
    return new Response(
      JSON.stringify({
        success: true,
        audio_url: publicUrl,
        history_id: historyRecord.id,
        words_used: actualWordCount,
        duration_seconds: durationSeconds, // optional, not stored in DB
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Audio generation error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
