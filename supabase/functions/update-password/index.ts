import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);
  
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(req);
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { token, newPassword } = await req.json();

    if (!token || !newPassword) {
      return new Response(JSON.stringify({ error: 'Token and new password are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Make sure token is trimmed and lowercase to match DB
    const normalizedToken = token.trim();

    // Verify token exists and not used
    const { data: tokenData, error: tokenError } = await supabase
      .from('password_reset_tokens')
      .select('*')
      .eq('token', normalizedToken)
      .is('used_at', null)
      .single();

    if (tokenError || !tokenData) {
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check token expiry
    if (new Date(tokenData.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: 'Token has expired' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update user password
    const { error: updateError } = await supabase.auth.admin.updateUserById(tokenData.user_id, {
      password: newPassword,
    });

    if (updateError) {
      return new Response(JSON.stringify({ error: 'Failed to update password' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Mark token as used
    const { data: updatedRows, error: usedError } = await supabase
      .from('password_reset_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('token', normalizedToken)
      .is('used_at', null)
      .select();

    if (usedError || !updatedRows || updatedRows.length === 0) {
      console.warn('Token update failed or already used:', usedError);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
