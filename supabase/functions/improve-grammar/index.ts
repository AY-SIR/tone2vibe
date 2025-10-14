import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, language } = await req.json();

    if (!text || text.trim().length < 3) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Text must be at least 3 characters long',
        improvedText: text
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    const lang = language || 'en-US';
    let improvedText = text;

    try {
      // === PAID API CALL HERE ===
      // Example: OpenAI GPT-4
      const apiKey = Deno.env.get('OPENAI_API_KEY');
      if (!apiKey) throw new Error('API key not configured');

      const apiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo', // or gpt-4
          messages: [
            {
              role: 'system',
              content: `You are a professional grammar checker. Correct grammar, spelling, punctuation errors. Maintain meaning and style. Only return corrected text.`
            },
            { role: 'user', content: text }
          ],
          temperature: 0,
          max_tokens: 4000
        })
      });

      if (!apiResponse.ok) throw new Error(`API failed: ${apiResponse.statusText}`);

      const data = await apiResponse.json();
      improvedText = data.choices?.[0]?.message?.content || text;

      return new Response(JSON.stringify({
        success: true,
        improvedText,
        language: lang
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (apiErr) {
      // Fallback: return original text if API fails
      console.error('Paid API error:', apiErr);
      return new Response(JSON.stringify({
        success: false,
        error: 'Grammar correction API unavailable',
        improvedText: text,
        language: lang
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      });
    }

  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Grammar correction failed',
      improvedText: ''
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
