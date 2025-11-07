import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { TOTP } from "https://esm.sh/otpauth@9.2.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function generateBackupCodes(count = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    codes.push(code);
  }
  return codes;
}

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
      console.error('enable-2fa: No user found in request');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { code } = await req.json();

    if (!code || code.length !== 6) {
      console.error('enable-2fa: Invalid code format', { code });
      return new Response(
        JSON.stringify({ error: 'Invalid code format. Please enter a 6-digit code.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's 2FA settings
    const { data: settings, error: fetchError } = await supabaseClient
      .from('user_2fa_settings')
      .select('secret, enabled')
      .eq('user_id', user.id)
      .single();

    if (fetchError || !settings) {
      console.error('enable-2fa: Failed to fetch 2FA settings', fetchError);
      return new Response(
        JSON.stringify({ error: '2FA not set up. Please generate a QR code first.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (settings.enabled) {
      console.error('enable-2fa: 2FA already enabled for user', user.id);
      return new Response(
        JSON.stringify({ error: '2FA is already enabled' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the code
    const totp = new TOTP({
      secret: TOTP.Secret.fromBase32(settings.secret),
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
    });

    const delta = totp.validate({ token: code, window: 1 });

    if (delta === null) {
      console.error('enable-2fa: Invalid TOTP code for user', user.id);
      return new Response(
        JSON.stringify({ error: 'Invalid verification code. Please check your authenticator app and try again.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate backup codes
    const backupCodes = generateBackupCodes(10);

    // Enable 2FA
    const { error: updateError } = await supabaseClient
      .from('user_2fa_settings')
      .update({
        enabled: true,
        backup_codes: backupCodes,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('enable-2fa: Database error enabling 2FA', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to enable 2FA. Please try again.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('enable-2fa: Successfully enabled 2FA for user', user.id);
    return new Response(
      JSON.stringify({
        success: true,
        backupCodes: backupCodes,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('enable-2fa: Unexpected error', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});