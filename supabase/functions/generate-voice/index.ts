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

    // Deduct actual word count for all users
    const wordsToDeduct = actualWordCount;

    // Check word limits
    const totalWordsAvailable = (profile.words_limit - profile.plan_words_used) + profile.word_balance;

    if (wordsToDeduct > totalWordsAvailable) {
      throw new Error(`Insufficient word balance. Need ${wordsToDeduct} words but only ${totalWordsAvailable} available.`);
    }

    // Create history record first (store plan in voice_settings for filtering)
    const { data: historyRecord, error: historyError } = await supabaseService
      .from("history")
      .insert({
        user_id: user.id,
        title,
        original_text: text,
        language,
        voice_settings: { ...voice_settings, plan: profile.plan },
        words_used: wordsToDeduct,
        generation_started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (historyError) {
      console.error("Failed to create history record:", historyError);
      throw new Error("Failed to create history record");
    }

    // For now, create a simple audio response since you'll connect custom endpoints later
    // This creates a placeholder that allows the workflow to complete to step 5
    const audioData = new Uint8Array(1024); // Placeholder audio data
    
    console.log("Voice generation with custom endpoint - placeholder created");

    // Upload to user-generates bucket
    const fileName = `${user.id}/${historyRecord.id}.mp3`;
    const { error: uploadError } = await supabaseService.storage
      .from("user-generates")
      .upload(fileName, audioData, {
        contentType: "audio/mpeg",
        duplex: "false"
      });

    if (uploadError) {
      console.error("Failed to upload audio:", uploadError);
      throw new Error("Failed to save audio file");
    }

    // Get public URL
    const { data: urlData } = supabaseService.storage
      .from("user-generates")
      .getPublicUrl(fileName);

    // Update history record with audio URL and completion time
    const { error: updateError } = await supabaseService
      .from("history")
      .update({
        audio_url: urlData.publicUrl,
        generation_completed_at: new Date().toISOString(),
        processing_time_ms: Date.now() - new Date(historyRecord.generation_started_at).getTime()
      })
      .eq("id", historyRecord.id);

    if (updateError) {
      console.error("Failed to update history:", updateError);
    }

    // Deduct words from user account
    const { error: deductError } = await supabaseService.rpc('deduct_words_smartly', {
      user_id_param: user.id,
      words_to_deduct: wordsToDeduct
    });

    if (deductError) {
      console.error("Failed to deduct words:", deductError);
      // Don't throw error as voice was already generated
    }

    // Schedule cleanup after 5 minutes for free users
    if (profile.plan === 'free') {
      setTimeout(async () => {
        try {
          await supabaseService.storage
            .from("user-generates")
            .remove([fileName]);
          
          await supabaseService
            .from("history")
            .update({ audio_url: null })
            .eq("id", historyRecord.id);
        } catch (error) {
          console.error("Cleanup failed:", error);
        }
      }, 5 * 60 * 1000); // 5 minutes
    }

    return new Response(JSON.stringify({
      success: true,
      audio_url: urlData.publicUrl,
      history_id: historyRecord.id,
      words_used: wordsToDeduct,
      cleanup_in_minutes: profile.plan === 'free' ? 5 : null
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Voice generation error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});