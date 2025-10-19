import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface EmailConfirmationRequest {
  email: string;
  password: string;
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

    const { email, password, fullName } = await req.json() as EmailConfirmationRequest;

    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'Email and password required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ----------- CREATE USER WITHOUT DEFAULT EMAIL -----------
    const { data: user, error: createError } = await supabaseClient.auth.admin.createUser({
      email,
      password,
      email_confirm: false, // disable default confirmation email
      user_metadata: { full_name: fullName || email.split('@')[0] },
    });

    if (createError) {
      console.error('User creation error:', createError);
      throw createError;
    }

    const userId = user.id;

    // ----------- GENERATE TOKEN -----------
    const { data: tokenData, error: tokenError } = await supabaseClient.rpc('generate_verification_token');

    if (tokenError) {
      console.error('Token generation error:', tokenError);
      throw tokenError;
    }

    const verificationToken = tokenData as string;

    // ----------- STORE TOKEN -----------
    const { error: insertError } = await supabaseClient
      .from('email_verification_tokens')
      .insert({
        user_id: userId,
        email,
        token: verificationToken,
        token_type: 'email_confirmation',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });

    if (insertError) throw insertError;

    // ----------- SEND EMAIL VIA BREVO -----------
    const origin = req.headers.get('origin') || 'https://tone2vibe.in';
    const confirmationUrl = `${origin}/email-confirmation?token=${verificationToken}`;
    const brevoApiKey = Deno.env.get('BREVO_API_KEY');
    if (!brevoApiKey) throw new Error('BREVO_API_KEY not configured');

    const displayName = fullName || email.split('@')[0];

    const emailResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': brevoApiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: 'Tone2Vibe', email: 'yadavakhilesh2519@gmail.com' },
        to: [{ email, name: displayName }],
        subject: 'Confirm Your Email - Tone2Vibe',
        htmlContent: `<p>Hi ${displayName}, verify your email: <a href="${confirmationUrl}">Click Here</a></p>`,
      }),
    });

    if (!emailResponse.ok) {
      const errText = await emailResponse.text();
      console.error('Brevo API error:', errText);
      throw new Error('Failed to send confirmation email');
    }

    return new Response(
      JSON.stringify({ success: true, userId, token: verificationToken }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('Edge Function error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
