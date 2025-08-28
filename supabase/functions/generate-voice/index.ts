import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const generationStartTime = new Date(); // Track start time
    
    const body = await req.json();
    const { text, voice_settings, language = "en-US" } = body;

    if (!text) {
      throw new Error("Text is required");
    }

    // Initialize Supabase
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

    // Calculate word count first
    const wordCount = text.trim().split(/\s+/).filter(word => word.length > 0).length;

    // Check if it's a sample request (don't charge words or save to history)
    const isSample = body.is_sample === true;

    // Generate a more realistic mock MP3 for testing
    // This creates a small silent MP3 that browsers can actually play
    const audioData = new Uint8Array([
      // MP3 frame header for 44.1kHz, 128kbps, mono
      0xFF, 0xFB, 0x90, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      // Additional silent frames to make it a proper duration based on word count
      ...Array(Math.min(wordCount * 20, 1000)).fill(0x00)
    ]);

    const base64Audio = btoa(String.fromCharCode(...audioData));

    // Only process billing and history for non-samples
    if (!isSample) {
      console.log(`Generated audio for ${wordCount} words, deducting from user ${user.id}`);

      // Use service role key for secure operations
      const supabaseService = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } }
      );

      // NEW: Use smart word deduction that handles plan vs purchased words correctly
      const { data: deductionResult, error: deductionError } = await supabaseService
        .rpc('deduct_words_smartly', {
          user_id_param: user.id,
          words_to_deduct: wordCount
        });

      if (deductionError || !deductionResult?.success) {
        const errorMsg = deductionError?.message || deductionResult?.error || 'Insufficient word balance';
        console.error('Word deduction failed:', errorMsg);
        
        return new Response(JSON.stringify({ 
          error: errorMsg,
          details: deductionResult || 'Unknown error'
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      console.log('Smart word deduction successful:', deductionResult);

      // Check for recent identical entries (prevent duplicates)
      const { data: recentEntries } = await supabaseService
        .from("history")
        .select("id")
        .eq("user_id", user.id)
        .eq("original_text", text)
        .gte("created_at", new Date(Date.now() - 30000).toISOString())
        .limit(1);

      if (recentEntries && recentEntries.length > 0) {
        console.log('Duplicate entry prevented - found recent identical entry');
      } else {
        const generationEndTime = new Date();
        const processingTimeMs = generationEndTime.getTime() - generationStartTime.getTime();
        
        console.log('Saving to history with time tracking:', {
          processingTimeMs,
          startTime: generationStartTime,
          endTime: generationEndTime
        });
        
        const { error: insertError } = await supabaseService.from("history").insert({
          user_id: user.id,
          title: `Voice Generation ${new Date().toLocaleDateString()}`,
          original_text: text,
          language: language,
          words_used: wordCount,
          voice_settings: { 
            ...(voice_settings || {}),
            is_sample: false
          },
          audio_url: `data:audio/mp3;base64,${base64Audio}`,
          processing_time_ms: processingTimeMs,
          generation_started_at: generationStartTime.toISOString(),
          generation_completed_at: generationEndTime.toISOString(),
          created_at: new Date().toISOString()
        });

        if (insertError) {
          console.error('Error inserting history:', insertError);
        }
      }
    } else {
      console.log(`Generated sample audio (${wordCount} words) - no billing or history saved`);
    }

    return new Response(JSON.stringify({ 
      audioContent: base64Audio,
      wordsUsed: isSample ? 0 : wordCount // Return 0 words used for samples
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});