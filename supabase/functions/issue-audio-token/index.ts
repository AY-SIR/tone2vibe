import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

type IssueBody = {
  bucket: "user-voices" | "user-generates";
  storagePath: string; // e.g. `${userId}/file.mp3`
  ttlSeconds?: number; // default 24h
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const anon = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const svc = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

    const { data: { user } } = await anon.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const body = (await req.json()) as IssueBody;
    const ttl = Math.min(Math.max(body.ttlSeconds ?? 24 * 3600, 60), 7 * 24 * 3600);

    // Validate path belongs to user
    const pathParts = body.storagePath.split("/");
    const ownerFolder = pathParts[0];
    if (ownerFolder !== user.id) throw new Error("Invalid storage path owner");

    // Basic existence check (silent)
    await svc.storage.from(body.bucket).list(ownerFolder, { limit: 1 });

    const token = crypto.randomUUID().replace(/-/g, "");
    const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();

    const { error: insErr } = await svc
      .from("audio_access_tokens")
      .insert({
        user_id: user.id,
        bucket: body.bucket,
        storage_path: body.storagePath,
        token,
        expires_at: expiresAt,
      });
    if (insErr) throw new Error(`Failed to issue token: ${insErr.message}`);

    return new Response(JSON.stringify({ ok: true, token, expires_at: expiresAt }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
