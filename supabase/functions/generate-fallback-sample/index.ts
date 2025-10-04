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

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user) throw new Error("User not authenticated");

    // Generate a simple fallback audio sample (no word deduction, no history)
    // This is just for preview purposes
    const audioData = new Uint8Array(512);

    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const fileName = `samples/${user.id}/fallback-sample-${Date.now()}.mp3`;
    const { error: uploadError } = await supabaseService.storage
      .from("user-generates")
      .upload(fileName, audioData, {
        contentType: "audio/mpeg",
        upsert: true,
      });

    if (uploadError) {
      console.error("Failed to upload fallback sample:", uploadError);
      throw new Error("Failed to save fallback sample");
    }

    const { data: urlData } = supabaseService.storage
      .from("user-generates")
      .getPublicUrl(fileName);

    // Auto-cleanup after 5 minutes
    setTimeout(async () => {
      try {
        await supabaseService.storage
          .from("user-generates")
          .remove([fileName]);
      } catch (error) {
        console.error("Fallback sample cleanup failed:", error);
      }
    }, 5 * 60 * 1000);

    return new Response(JSON.stringify({
      success: true,
      audio_url: urlData.publicUrl,
      sample_text: "Fallback sample for preview",
      expires_in_minutes: 5,
      is_fallback: true
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Fallback sample generation error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || "Unknown error"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
