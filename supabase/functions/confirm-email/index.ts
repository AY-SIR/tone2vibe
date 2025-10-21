import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400'
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Server configuration error'
      }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    let token: string | undefined;
    try {
      const body = await req.json();
      token = body.token;
    } catch (e) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid request body'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!token) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Token is required'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verify token
    const { data: tokenData, error: tokenError } = await supabaseClient
      .from('email_verification_tokens')
      .select('*')
      .eq('token', token)
      .eq('token_type', 'email_confirmation')
      .is('used_at', null)
      .maybeSingle();

    if (tokenError) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to verify token'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!tokenData) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid or expired confirmation link'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check if token is expired
    if (new Date(tokenData.expires_at) < new Date()) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Confirmation link has expired'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Confirm user email
    const { error: confirmError } = await supabaseClient.auth.admin.updateUserById(
      tokenData.user_id,
      { email_confirm: true }
    );

    if (confirmError) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to confirm email'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Mark token as used
    await supabaseClient
      .from('email_verification_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('token', token);

    return new Response(JSON.stringify({
      success: true,
      message: 'Email confirmed successfully! You can now sign in.'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});