import "https://deno.land/x/xhr@0.1.0/mod.ts";
function getCorsHeaders(origin: string) {
  const allowed = [
    "https://tone2vibe.in",
    "http://localhost:8080"
  ];
  return {
    "Access-Control-Allow-Origin": allowed.includes(origin) ? origin : "https://tone2vibe.in",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PUT, DELETE"
  };
}
/*  Single API keys from environment */ const OPENROUTER_KEY = Deno.env.get("OPENROUTER_KEY");
const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY");
/*  Exactly 4 OpenRouter models */ const MODELS = [
  "qwen/qwen3-235b-a22b",
  "z-ai/glm-4.5-air",
  "deepseek/deepseek-v3-0324",
  "tngtech/deepseek-r1t2-chimera"
];
async function callOpenRouter(model: string, text: string) {
  // 🔧 Removed quotes around ${text} to avoid "..." in output
  const prompt = `Fix all grammar, spelling, and punctuation errors in the following text. Keep the same tone and meaning. Return only the corrected text:\n\n${text}`;
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENROUTER_KEY}`,
      "HTTP-Referer": "https://tone2vibe.in",
      "X-Title": "Tone2Vibe Grammar Fixer",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content: "You are a professional grammar corrector and proofreader."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0
    })
  });
  if (!res.ok) throw new Error(`${model} request failed (${res.status})`);
  const data = await res.json();
  return data?.choices?.[0]?.message?.content?.trim() ?? "";
}
async function callGeminiLite(text: string) {
  // 🔧 Removed quotes around ${text}
  const prompt = `Fix all grammar, spelling, and punctuation errors. Keep the same tone and meaning. Return only the corrected text:\n\n${text}`;
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
/*  Main handler */ Deno.serve(async (req)=>{
  const origin = req.headers.get("origin") ?? "";
  const corsHeaders = getCorsHeaders(origin);
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    const { text } = await req.json();
    if (!text || text.trim().length < 3) {
      throw new Error("Text too short or missing");
    }
    let corrected = "";
    // Try all 4 models sequentially
    for (const model of MODELS){
      try {
        corrected = await callOpenRouter(model, text);
        if (corrected) break;
      } catch (_) {
      // continue to next model
      }
    }
    // Fallback to Gemini if all 4 fail
    if (!corrected) corrected = await callGeminiLite(text);
    return new Response(JSON.stringify({
      success: true,
      improvedText: corrected
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
