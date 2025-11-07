import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { TOTP, Secret } from "https://esm.sh/otpauth@9.2.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { code, password, isBackupCode } = await req.json();

    if (!code || !password) {
      return new Response(
        JSON.stringify({ error: 'Code and password are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify password
    const { error: signInError } = await supabaseClient.auth.signInWithPassword({
      email: user.email!,
      password: password,
    });

    if (signInError) {
      return new Response(
        JSON.stringify({ error: 'Invalid password' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's 2FA settings
    const { data: settings } = await supabaseClient
      .from('user_2fa_settings')
      .select('secret, enabled, backup_codes')
      .eq('user_id', user.id)
      .single();

    if (!settings || !settings.enabled) {
      return new Response(
        JSON.stringify({ error: '2FA is not enabled' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let isValid = false;

    if (isBackupCode) {
      // Check backup code
      if (settings.backup_codes && settings.backup_codes.includes(code)) {
        isValid = true;
      }
    } else {
      // Verify TOTP code
      const totp = new TOTP({
        secret: Secret.fromBase32(settings.secret),
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
      });

      const delta = totp.validate({ token: code, window: 1 });
      isValid = delta !== null;
    }

    if (!isValid) {
      return new Response(
        JSON.stringify({ error: isBackupCode ? 'Invalid backup code' : 'Invalid 2FA code' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Delete 2FA settings
    const { error: deleteError } = await supabaseClient
      .from('user_2fa_settings')
      .delete()
      .eq('user_id', user.id);

    if (deleteError) {
      // Log suppressed to avoid sensitive data leakage
      return new Response(
        JSON.stringify({ error: 'Failed to disable 2FA' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});