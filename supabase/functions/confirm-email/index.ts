import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
};

interface ConfirmEmailRequest {
  token: string;
}

Deno.serve(async (req: Request) => {
  console.log('=== CONFIRM EMAIL REQUEST START ===');
  console.log('Method:', req.method);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS preflight');
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    console.log('Environment check:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseKey
    });

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing environment variables');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Parse request
    let token: string;
    try {
      const body = await req.json() as ConfirmEmailRequest;
      token = body.token;
      console.log('Token received:', token ? 'Yes' : 'No');
    } catch (e) {
      console.error('JSON parse error:', e);
      return new Response(
        JSON.stringify({ error: 'Invalid request body' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!token) {
      console.error('Token missing');
      return new Response(
        JSON.stringify({ error: 'Token is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Verify token
    console.log('Querying token from database...');
    const { data: tokenData, error: tokenError } = await supabaseClient
      .from('email_verification_tokens')
      .select('*')
      .eq('token', token)
      .eq('token_type', 'email_confirmation')
      .is('used_at', null)
      .maybeSingle();

    if (tokenError) {
      console.error('Token query error:', tokenError);
      return new Response(
        JSON.stringify({
          error: 'Failed to verify token',
          details: tokenError.message
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!tokenData) {
      console.log('Token not found or already used');
      return new Response(
        JSON.stringify({ error: 'Invalid or expired confirmation link' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Token found for user:', tokenData.user_id);

    // Check if token is expired
    if (new Date(tokenData.expires_at) < new Date()) {
      console.log('Token expired');
      return new Response(
        JSON.stringify({ error: 'Confirmation link has expired' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Confirm user email using admin API
    console.log('Confirming user email...');
    const { error: confirmError } = await supabaseClient.auth.admin.updateUserById(
      tokenData.user_id,
      { email_confirm: true }
    );

    if (confirmError) {
      console.error('Confirmation error:', confirmError);
      return new Response(
        JSON.stringify({
          error: 'Failed to confirm email. Please try again.',
          details: confirmError.message
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Email confirmed successfully');

    // Mark token as used
    const { error: updateError } = await supabaseClient
      .from('email_verification_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('token', token);

    if (updateError) {
      console.error('Token update error:', updateError);
      // Don't fail the confirmation, just log the error
    }

    console.log('=== SUCCESS ===');
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email confirmed successfully! You can now sign in.'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (err) {
    console.error('=== ERROR ===');
    console.error('Edge Function error:', err);
    console.error('Stack:', err.stack);

    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : 'Internal server error',
        type: err.constructor.name
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});