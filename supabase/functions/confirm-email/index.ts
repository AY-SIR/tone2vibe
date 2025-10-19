import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ConfirmEmailRequest {
  token: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      status: 200,
      headers: corsHeaders
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
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
    } catch (e) {
      return new Response(
        JSON.stringify({ error: 'Invalid request body' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Token is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
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
      console.error('Token query error:', tokenError);
      return new Response(
        JSON.stringify({ error: 'Failed to verify token' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!tokenData) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired confirmation link' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if token is expired
    if (new Date(tokenData.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'Confirmation link has expired' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Confirm user email using admin API
    const { error: confirmError } = await supabaseClient.auth.admin.updateUserById(
      tokenData.user_id,
      { email_confirm: true }
    );

    if (confirmError) {
      console.error('Confirmation error:', confirmError);
      return new Response(
        JSON.stringify({ error: 'Failed to confirm email. Please try again.' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Mark token as used
    const { error: updateError } = await supabaseClient
      .from('email_verification_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('token', token);

    if (updateError) {
      console.error('Token update error:', updateError);
      // Don't fail the confirmation, just log the error
    }

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
    console.error('Edge Function error:', err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : 'Internal server error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});