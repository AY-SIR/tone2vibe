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
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!email || !password) {
      return new Response(
        JSON.stringify({ success: false, error: 'Email and password are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user exists
    const { data: usersData, error: listError } = await supabaseClient.auth.admin.listUsers();

    if (listError) {
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to verify user status' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const existingUser = usersData?.users?.find(
      u => u.email?.toLowerCase() === normalizedEmail
    );

    if (existingUser) {
      return new Response(
        JSON.stringify({ success: false, error: 'An account with this email already exists' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #000000 0%, #2d2d2d 100%); padding: 40px 30px; text-align: center;">
              <div style="display: inline-block; background-color: #ffffff; width: 60px; height: 60px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 15px;">
                <img src="https://res.cloudinary.com/dcrfzlqak/image/upload/v1758802751/favicon_yoag75.png" alt="Tone2Vibe" width="32" height="32" style="display: block; margin: 14px auto;" />
              </div>
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600; letter-spacing: -0.5px;">Confirm Your Email</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 15px;">Hello <strong>${displayName}</strong>,</p>

              <p style="color: #666666; font-size: 15px; line-height: 1.6; margin: 0 0 10px;">Thank you for signing up for Tone2Vibe!</p>

              <p style="color: #666666; font-size: 15px; line-height: 1.6; margin: 0 0 30px;">Please confirm your email address to activate your account.</p>

              <!-- Button -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding: 0 0 30px;">
                    <a href="${confirmationUrl}" style="display: inline-block; background-color: #000000; color: #ffffff; text-decoration: none; padding: 14px 40px; font-size: 15px; font-weight: 600; border-radius: 6px; letter-spacing: 0.3px;">Confirm Email Address</a>
                  </td>
                </tr>
              </table>

              <!-- Info Box -->
              <div style="background-color: #f8f9fa; border-left: 3px solid #000000; padding: 20px; border-radius: 4px; margin-top: 20px;">
                <p style="color: #333333; font-size: 14px; line-height: 1.6; margin: 0 0 10px; font-weight: 600;">Important:</p>
                <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 0;">This link will expire in <strong>24 hours</strong>. If you didn't create this account, please ignore this email.</p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e9ecef;">
              <p style="color: #333333; font-size: 16px; font-weight: 600; margin: 0 0 8px;">Tone2Vibe</p>
              <p style="color: #999999; font-size: 13px; margin: 0;">&copy; ${new Date().getFullYear()} Tone2Vibe. All rights reserved.</p>
            </td>
          </tr>

        </table>

        <!-- Legal Text -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; margin-top: 20px;">
          <tr>
            <td align="center">
              <p style="color: #999999; font-size: 12px; line-height: 1.5; margin: 0;">This is an automated message. Please do not reply to this email.</p>
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
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});