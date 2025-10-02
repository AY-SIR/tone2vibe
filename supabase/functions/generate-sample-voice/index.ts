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

    const { voice_settings = {} } = await req.json();

    const sampleText = "This is a test sample of your voice. Listen carefully to evaluate the quality.";

    const audioData = new Uint8Array(1024);

    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const fileName = `samples/${user.id}/sample-${Date.now()}.mp3`;
    const { error: uploadError } = await supabaseService.storage
      .from("user-generates")
      .upload(fileName, audioData, {
        contentType: "audio/mpeg",
      });

    if (uploadError) {
      console.error("Failed to upload sample:", uploadError);
      throw new Error("Failed to save sample audio");
    }

    const { data: urlData } = supabaseService.storage
      .from("user-generates")
      .getPublicUrl(fileName);

    setTimeout(async () => {
      try {
        await supabaseService.storage
          .from("user-generates")
          .remove([fileName]);
      } catch (error) {
        console.error("Sample cleanup failed:", error);
      }
    }, 5 * 60 * 1000);

    return new Response(JSON.stringify({
      success: true,
      audio_url: urlData.publicUrl,
      sample_text: sampleText,
      expires_in_minutes: 5
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Sample generation error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
