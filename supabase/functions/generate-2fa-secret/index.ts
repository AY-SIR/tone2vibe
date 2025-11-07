import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { TOTP } from "https://esm.sh/otpauth@9.2.3";
import QRCode from "https://esm.sh/qrcode@1.5.3";

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

    // Check if user already has 2FA enabled
    const { data: existing } = await supabaseClient
      .from('user_2fa_settings')
      .select('enabled')
      .eq('user_id', user.id)
      .single();

    if (existing?.enabled) {
      return new Response(
        JSON.stringify({ error: '2FA is already enabled' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate TOTP secret
    const totp = new TOTP({
      issuer: 'VoiceClone',
      label: user.email,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
    });

    const secret = totp.secret.base32;

    // Generate QR code as SVG (works in Deno without canvas)
    const otpauthUrl = totp.toString();
    const qrCodeSvg = await QRCode.toString(otpauthUrl, { type: 'svg', width: 200 });
    // Convert SVG to data URL
    const qrCodeDataUrl = `data:image/svg+xml;base64,${btoa(qrCodeSvg)}`;

    // Store secret (not enabled yet)
    const { error: upsertError } = await supabaseClient
      .from('user_2fa_settings')
      .upsert({
        user_id: user.id,
        secret: secret,
        enabled: false,
      }, {
        onConflict: 'user_id'
      });

    if (upsertError) {
      return new Response(
        JSON.stringify({ error: 'Failed to generate 2FA secret' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        qrCode: qrCodeDataUrl,
        secret: secret,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});