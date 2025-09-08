import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Generate voice function called');
    
    const { text, voiceSettings, language = 'en-US', title } = await req.json();
    console.log('Request data:', { text: text?.substring(0, 100), voiceSettings, language, title });

    // Validate input - server-side sanity checks
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      console.error('Invalid text input');
      return new Response(
        JSON.stringify({ error: 'Text is required and must be a non-empty string' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Server-side word count validation
    const wordCount = text.trim().split(/\s+/).length;
    if (wordCount > 10000) {
      console.error('Text too long:', wordCount);
      return new Response(
        JSON.stringify({ error: 'Text exceeds maximum word limit of 10,000 words' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get the authorization header and extract the JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('No authorization header found');
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('Token extracted, length:', token.length);

    // Initialize Supabase client with anon key for user verification
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase configuration');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

    // Verify the user's JWT token
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Authentication failed:', authError);
      return new Response(
        JSON.stringify({ error: 'Authentication failed' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('User authenticated:', user.id);
    
    // Create Supabase service client for database operations
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseServiceKey) {
      console.error('Missing service role key');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const supabaseService = createClient(
      supabaseUrl,
      supabaseServiceKey,
      {
        auth: {
          persistSession: false
        }
      }
    );

    // Check and deduct words using the smart deduction function
    console.log('Attempting to deduct words for user:', user.id, 'Words needed:', wordCount);
    
    const { data: deductResult, error: deductError } = await supabaseService
      .rpc('deduct_words_smartly', {
        user_id_param: user.id,
        words_to_deduct: wordCount
      });

    if (deductError) {
      console.error('Error deducting words:', deductError);
      return new Response(
        JSON.stringify({ error: 'Failed to process word deduction' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (!deductResult || !deductResult.success) {
      console.log('Word deduction failed:', deductResult);
      return new Response(
        JSON.stringify({ 
          error: 'Insufficient word balance',
          details: deductResult
        }),
        { 
          status: 402, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Words deducted successfully:', deductResult);

    // Create initial history record
    const { data: historyData, error: historyError } = await supabaseService
      .from('history')
      .insert({
        user_id: user.id,
        title: title || `Voice Generation - ${new Date().toLocaleString()}`,
        original_text: text,
        language: language,
        voice_settings: voiceSettings || {},
        words_used: wordCount,
        generation_started_at: new Date().toISOString()
      })
      .select()
      .single();

    if (historyError) {
      console.error('Error creating history record:', historyError);
      return new Response(
        JSON.stringify({ error: 'Failed to create history record' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('History record created:', historyData.id);

    // For open source - generate mock audio URL since no external TTS API
    console.log('Generating mock audio for open source implementation');
    
    // Simulate realistic processing time
    const processingTime = Math.min(wordCount * 100, 5000); // 100ms per word, max 5s
    await new Promise(resolve => setTimeout(resolve, Math.min(processingTime, 2000)));
    
    // Generate mock audio URL - replace with your open source TTS integration
    const mockAudioUrl = `data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmgXFXLG7dp/NgcjdL3u17VOEgxLo+vvsWIbCjaLzfPJfCQELIDF8eSKOQccc7PnlF0SB1Sl4NPldUoBJHjF8OGRQgsQb7rm7qU+HwU7j+Nz0CpfAA==`;

    // Update history record with completion
    const { error: updateError } = await supabaseService
      .from('history')
      .update({
        audio_url: mockAudioUrl,
        generation_completed_at: new Date().toISOString(),
        processing_time_ms: processingTime
      })
      .eq('id', historyData.id);

    if (updateError) {
      console.error('Error updating history record:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update history record' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Voice generation completed successfully');

    return new Response(
      JSON.stringify({ 
        audio_url: mockAudioUrl,
        history_id: historyData.id,
        words_used: wordCount,
        processing_time: processingTime,
        message: 'Voice generated successfully (open source mock)'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in generate-voice function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});