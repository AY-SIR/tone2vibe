import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { TOTP } from "https://esm.sh/otpauth@9.2.3";

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

    const { code, isBackupCode } = await req.json();

    if (!code) {
      return new Response(
        JSON.stringify({ error: 'Code is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rate limiting: check recent failed attempts
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: recentAttempts } = await supabaseAdmin
      .from('user_2fa_attempts')
      .select('success')
      .eq('user_id', user.id)
      .eq('success', false)
      .gte('attempted_at', fiveMinutesAgo);

    if (recentAttempts && recentAttempts.length >= 5) {
      return new Response(
        JSON.stringify({ error: 'Too many failed attempts. Please try again in 5 minutes.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
        // Remove used backup code
        const updatedCodes = settings.backup_codes.filter((c: string) => c !== code);
        await supabaseClient
          .from('user_2fa_settings')
          .update({ backup_codes: updatedCodes })
          .eq('user_id', user.id);
      }
    } else {
      // Verify TOTP code
      const totp = new TOTP({
        secret: TOTP.Secret.fromBase32(settings.secret),
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
      });

      const delta = totp.validate({ token: code, window: 1 });
      isValid = delta !== null;
    }

    // Log attempt
    await supabaseAdmin
      .from('user_2fa_attempts')
      .insert({
        user_id: user.id,
        success: isValid,
        attempted_at: new Date().toISOString(),
      });

    if (isValid) {
      // Update last used
      await supabaseClient
        .from('user_2fa_settings')
        .update({ last_used_at: new Date().toISOString() })
        .eq('user_id', user.id);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid code' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in verify-2fa:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});