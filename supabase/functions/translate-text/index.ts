import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
//  Allow all origins, headers, and methods (universal CORS)
function getCorsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PUT, DELETE"
  };
}
//  Single API keys from environment
const OPENROUTER_KEY = Deno.env.get("OPENROUTER_KEY");
const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY");
//  Exactly 4 OpenRouter models
const MODELS = [
  "deepseek/deepseek-v3-0324",
  "qwen/qwen3-235b-a22b",
  "z-ai/glm-4.5-air",
  "tngtech/deepseek-r1t2-chimera"
];
//  OpenRouter translation call
async function callOpenRouter(model, text, lang) {
  const prompt = `Translate the following text into ${lang}. Return only the translated text:\n\n"${text}"`;
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENROUTER_KEY}`,
      "HTTP-Referer": "https://tone2vibe.in",
      "X-Title": "Tone2Vibe Translator",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content: "You are a multilingual translator."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.2
    })
  });
  if (!res.ok) throw new Error(`${model} failed (${res.status})`);
  const data = await res.json();
  return data?.choices?.[0]?.message?.content?.trim() ?? "";
}
//  Gemini fallback (if all OpenRouter models fail)
async function callGeminiLite(text, lang) {
  const prompt = `Translate this text into ${lang}. Return only the translated text:\n\n"${text}"`;
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_KEY}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: prompt
            }
          ]
        }
      ]
    })
  });
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
}
//  Main handler
Deno.serve(async (req)=>{
  const origin = req.headers.get("origin") ?? "";
  const corsHeaders = getCorsHeaders(origin);
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    const { text, targetLanguage } = await req.json();
    if (!text || !targetLanguage) throw new Error("Missing text or target language");
    let translated = "";
    // Try all 4 OpenRouter models in order
    for (const model of MODELS){
      try {
        translated = await callOpenRouter(model, text, targetLanguage);
        if (translated) break;
      } catch (_) {
      // continue to next model
      }
    }
    // Fallback to Gemini if all fail
    if (!translated) translated = await callGeminiLite(text, targetLanguage);
    return new Response(JSON.stringify({
      success: true,
      translatedText: translated
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({
      success: false,
      error: err.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});
