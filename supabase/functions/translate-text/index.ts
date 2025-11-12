import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
function getCorsHeaders(origin) {
  const allowed = [
    "https://tone2vibe.in",
    "http://localhost:8080"
  ];
  return {
    "Access-Control-Allow-Origin": allowed.includes(origin) ? origin : "https://tone2vibe.in",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };
}
const OPENROUTER_KEYS = Object.entries(Deno.env.toObject()).filter(([k])=>k.startsWith("OPENROUTER_KEY_")).map(([_, v])=>v);
const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY");
const MODELS = [
  "qwen/qwen3-235b-a22b",
  "z-ai/glm-4.5-air",
  "deepseek/deepseek-v3-0324",
  "tngtech/deepseek-r1t2-chimera",
  "google/gemini-2.0-flash-experimental"
];
function getRandomKey() {
  return OPENROUTER_KEYS[Math.floor(Math.random() * OPENROUTER_KEYS.length)];
}
async function callOpenRouter(model, text, lang, key) {
  const prompt = `Translate the following text into ${lang}. Return translated text only:\n\n"${text}"`;
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${key}`,
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
  if (!res.ok) throw new Error(`${model} failed`);
  const data = await res.json();
  return data?.choices?.[0]?.message?.content?.trim() ?? "";
}
async function callGeminiLite(text, lang) {
  const prompt = `Translate this text into ${lang}. Return translated text only:\n\n"${text}"`;
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
Deno.serve(async (req)=>{
  const origin = req.headers.get("origin") ?? "";
  const corsHeaders = getCorsHeaders(origin);
  if (req.method === "OPTIONS") return new Response(null, {
    headers: corsHeaders
  });
  try {
    const { text, targetLanguage } = await req.json();
    if (!text || !targetLanguage) throw new Error("Missing text or target language");
    let translated = "";
    for (const model of MODELS){
      try {
        translated = await callOpenRouter(model, text, targetLanguage, getRandomKey());
        if (translated) break;
      } catch (_) {}
    }
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
