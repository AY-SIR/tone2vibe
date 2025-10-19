import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface EmailConfirmationRequest {
  email: string;
  userId: string;
  fullName?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { email, userId, fullName } = await req.json() as EmailConfirmationRequest;

    if (!email || !userId) {
      return new Response(JSON.stringify({ error: 'Email and userId are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // --- Generate token ---
    const { data: tokenData, error: tokenError } = await supabaseClient
      .rpc('generate_verification_token');

    if (tokenError) throw new Error('Failed to generate verification token');

    const verificationToken = tokenData as string;

    // --- Store token in DB ---
    const { error: insertError } = await supabaseClient
      .from('email_verification_tokens')
      .insert({
        user_id: userId,
        email,
        token: verificationToken,
        token_type: 'email_confirmation',
      });

    if (insertError) throw new Error('Failed to store verification token');

    // --- Prepare confirmation URL ---
    const confirmationUrl = `${Deno.env.get('SITE_URL') || 'https://tone2vibe.in'}/email-confirmation?token=${verificationToken}`;

    // --- Send email via Brevo ---
    const brevoApiKey = Deno.env.get('BREVO_API_KEY');
    if (!brevoApiKey) throw new Error('Email service not configured');

    const emailResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': brevoApiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: 'Tone2Vibe', email: 'noreply@tone2vibe.in' },
        to: [{ email, name: fullName || email.split('@')[0] }],
        subject: 'Confirm Your Email - Tone2Vibe',
        htmlContent: `<p>Hi ${fullName || 'there'},</p>
                      <p>Click the link below to confirm your email:</p>
                      <a href="${confirmationUrl}">Confirm Email</a>
                      <p>This link expires in 24 hours.</p>`,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      throw new Error('Failed to send confirmation email: ' + errorText);
    }

    return new Response(JSON.stringify({ success: true, token: verificationToken }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('send-email-confirmation error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
