import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(req);
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    if (!token) return new Response("Missing token", { status: 400, headers: corsHeaders });

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const svc = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

    // Lookup token
    const { data: rows, error } = await svc
      .from("audio_access_tokens")
      .select("user_id, bucket, storage_path, expires_at")
      .eq("token", token)
      .limit(1);
    if (error || !rows || rows.length === 0) return new Response("Invalid token", { status: 404, headers: corsHeaders });

    const row = rows[0];
    if (new Date(row.expires_at) < new Date()) return new Response("Expired token", { status: 410, headers: corsHeaders });

    // Fetch from storage via signed URL (internal), then stream
    const { data: signed, error: signErr } = await svc
      .storage
      .from(row.bucket)
      .createSignedUrl(row.storage_path, 60);
    if (signErr || !signed?.signedUrl) return new Response("File not found", { status: 404, headers: corsHeaders });

    const upstream = await fetch(signed.signedUrl);
    if (!upstream.ok || !upstream.body) return new Response("Upstream error", { status: 502, headers: corsHeaders });

    const contentType = upstream.headers.get("Content-Type") || "audio/mpeg";
    const headers = new Headers({ ...corsHeaders, "Content-Type": contentType, "Cache-Control": "no-store" });

    // Support range requests for better UX
    if (req.headers.get("Range")) {
      // Pass through range by fetching the whole and letting the browser handle; or implement full range by HEAD+range.
      // For simplicity, just stream body; most browsers handle playback.
    }

    return new Response(upstream.body, { status: 200, headers });
  } catch (e) {
    return new Response("Internal error", { status: 500, headers: corsHeaders });
  }
});
