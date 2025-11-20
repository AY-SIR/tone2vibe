import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(req);
  }

  try {
    // Load environment variables
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

    if (!SUPABASE_URL || !SERVICE_KEY || !ANON_KEY) {
      throw new Error("Missing Supabase environment variables");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    // Authenticated client (for user)
    const anon = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    // Service client (for DB and storage access)
    const svc = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false },
    });

    // Get user info
    const { data: { user }, error: userErr } = await anon.auth.getUser();
    if (userErr || !user) throw new Error("User not authenticated");

    // Parse request body
    const body = await req.json();
    const { bucket, storagePath, ttlSeconds } = body;

    if (!bucket || !storagePath) throw new Error("Missing bucket or storagePath");

    const ttl = Math.min(Math.max(ttlSeconds ?? 24 * 3600, 60), 7 * 24 * 3600);

    // Validate that path belongs to user
    const pathParts = storagePath.split("/");
    const ownerFolder = pathParts[0];
    if (ownerFolder !== user.id) throw new Error("Invalid storage path owner");

    // Optional: basic existence check
    await svc.storage.from(bucket).list(ownerFolder, { limit: 1 });

    // Try to find an existing valid token (not expired)
    const nowIso = new Date().toISOString();
    const { data: existingTokens, error: selErr } = await svc
      .from("audio_access_tokens")
      .select("id, token, expires_at")
      .eq("user_id", user.id)
      .eq("bucket", bucket)
      .eq("storage_path", storagePath)
      .gt("expires_at", nowIso)
      .order("expires_at", { ascending: false })
      .limit(1);

    if (selErr) throw new Error(`Token lookup failed: ${selErr.message}`);

    const existing = existingTokens?.[0];

    if (existing) {
      // 🎯 Reuse existing valid token
      return new Response(JSON.stringify({
        ok: true,
        token: existing.token,
        expires_at: existing.expires_at,
        reused: true
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 🆕 No valid token found → issue new one
    const token = crypto.randomUUID().replace(/-/g, "");
    const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();

    const { error: insErr } = await svc.from("audio_access_tokens").insert({
      user_id: user.id,
      bucket,
      storage_path: storagePath,
      token,
      expires_at: expiresAt
    });

    if (insErr) throw new Error(`Failed to issue token: ${insErr.message}`);

    return new Response(JSON.stringify({
      ok: true,
      token,
      expires_at: expiresAt,
      reused: false
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (e) {
    return new Response(JSON.stringify({
      ok: false,
      error: e.message
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400
    });
  }
});
