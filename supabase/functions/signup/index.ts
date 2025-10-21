import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const brevoApiKey = Deno.env.get('BREVO_API_KEY');

    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Server configuration error' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    let email, password, fullName;
    try {
      const body = await req.json();
      email = body.email;
      password = body.password;
      fullName = body.fullName;
    } catch (e) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid request body' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!email || !password) {
      return new Response(
        JSON.stringify({ success: false, error: 'Email and password are required' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user exists
    const { data: usersData, error: listError } = await supabaseClient.auth.admin.listUsers();

    if (listError) {
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to verify user status' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const existingUser = usersData?.users?.find(
      u => u.email?.toLowerCase() === normalizedEmail
    );

    if (existingUser) {
      return new Response(
        JSON.stringify({ success: false, error: 'An account with this email already exists' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create user
    const { data: userData, error: createError } = await supabaseClient.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: false,
      user_metadata: {
        full_name: fullName || email.split('@')[0]
      }
    });

    if (createError || !userData?.user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create user' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = userData.user.id;

    // Generate verification token
    const verificationToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    // Store token
    const { error: insertError } = await supabaseClient
      .from('email_verification_tokens')
      .insert({
        user_id: userId,
        email: normalizedEmail,
        token: verificationToken,
        token_type: 'email_confirmation',
        expires_at: expiresAt
      });

    if (insertError) {
      await supabaseClient.auth.admin.deleteUser(userId);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create verification token' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send email via Brevo
    if (brevoApiKey) {
      const origin = req.headers.get('origin') || 'https://tone2vibe.in';
      const confirmationUrl = `${origin}/email-confirmation?token=${verificationToken}`;
      const displayName = fullName || email.split('@')[0];

      const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirm Your Email - Tone2Vibe</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #fafafa;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #fafafa; padding: 60px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 500px; background-color: #ffffff; border-radius: 8px;">

         <!-- Content -->
<tr>
  <td style="padding: 50px 40px; text-align: center; display: flex; align-items: center; justify-content: center; gap: 12px; flex-wrap: wrap;">

    <!-- Logo -->
    <img src="https://res.cloudinary.com/dcrfzlqak/image/upload/v1758802751/favicon_yoag75.png"
         alt="Tone2Vibe" width="48" height="48" />

    <!-- Heading -->
    <h1 style="color: #000000; margin: 0; font-size: 24px; font-weight: 600;">
      Confirm your email
    </h1>

  </td>
</tr>

<!-- Greeting -->
<tr>
  <td style="padding: 0 40px 16px; text-align: center;">
    <p style="color: #666666; font-size: 15px; line-height: 1.5; margin: 0 0 8px;">
      Hi <strong>${displayName}</strong>,
    </p>

    <p style="color: #666666; font-size: 15px; line-height: 1.5; margin: 0 0 32px;">
      Click the button below to verify your account.
    </p>

    <!-- Button -->
    <a href="${confirmationUrl}" style="display: inline-block; background-color: #000000; color: #ffffff; text-decoration: none; padding: 12px 32px; font-size: 15px; font-weight: 500; border-radius: 6px;">
      Confirm Email
    </a>

    <p style="color: #999999; font-size: 13px; line-height: 1.5; margin: 32px 0 0;">
      This link expires in 24 hours. Didn't sign up? Ignore this email.
    </p>
  </td>
</tr>


          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; text-align: center; border-top: 1px solid #f0f0f0;">
              <p style="color: #999999; font-size: 12px; margin: 0;">&copy; ${new Date().getFullYear()} Tone2Vibe. All rights reserved.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `;

      try {
        await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'accept': 'application/json',
            'api-key': brevoApiKey,
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            sender: { name: 'Tone2Vibe', email: 'yadavakhilesh2519@gmail.com' },
            to: [{ email: normalizedEmail, name: displayName }],
            subject: 'Confirm Your Email - Tone2Vibe',
            htmlContent: emailHtml
          })
        });
      } catch (emailError) {
        // Email error - silent fail
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        userId,
        message: 'Account created successfully! Please check your email to confirm.'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});