import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

interface PasswordResetRequest {
  email: string;
}

// Email Template
function getPasswordResetEmailTemplate(fullName: string, resetUrl: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif; background: linear-gradient(135deg, #f5f7fa 0%, #e8eef3 100%);">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="padding: 10px 5px;">
    <tr>
      <td align="center">
        <!-- Main Container -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 560px; background-color: #ffffff; border-radius: 20px; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06); overflow: hidden;">

            <!-- Header with Logo -->
          <tr>
            <td style="padding: 48px 32px 24px; background: linear-gradient(180deg, #fafafa 0%, #ffffff 100%); text-align: center;">
             <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
  <tr>
    <!-- Logo -->
    <td style="padding-right: 10px; vertical-align: middle;">
      <img src="https://res.cloudinary.com/dcrfzlqak/image/upload/v1758802751/favicon_yoag75.png"
           alt="Tone2Vibe"
           width="40"
           height="40"
           style="display: block; border-radius: 8px;
           "  draggable="false"/>
    </td>

    <!-- Brand Name -->
    <td style="vertical-align: middle;">
      <span style="
        font-size: 22px;
        font-weight: 600;
        color: #111111;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
      ">
        Tone2Vibe
      </span>
    </td>
  </tr>
</table>
 <div
                style="
                  width: 100%;
                  height: 1px;
                  background: linear-gradient(to right, #e6e6e6, #f7f7f7);
                  margin: 24px 0 20px;
                "
              ></div>
<h1
  style="
    color: #1a1a1a;
    margin: 0;
    font-weight: 700;
    letter-spacing: -0.5px;
    text-align: center;
    font-size: 22px;
  "
>
  Reset Your Password
</h1>


            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 32px 32px;">
              <p style="color: #1a1a1a; font-size: 16px; line-height: 1.6; margin: 0 0 8px; font-weight: 500;">
                Hi ${fullName},
              </p>

              <p style="color: #666666; font-size: 15px; line-height: 1.7; margin: 0 0 32px;">
                We received a request to reset your password for your Tone2Vibe account. Click the button below to create a new password.
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding: 0 0 32px;">
                    <a href="${resetUrl}" style="display: inline-block; background-color: #1a1a1a; color: #ffffff; text-decoration: none; padding: 16px 48px; font-size: 15px; font-weight: 600; border-radius: 10px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>


            </td>
          </tr>

          <!-- Notice Box -->
          <tr>
            <td style="padding: 0 10px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #fff8e6; border-left: 4px solid #f59e0b; border-radius: 8px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="color: #92400e; font-size: 13px; line-height: 1.6; margin: 0;">
                      <strong style="color: #78350f;"> Security Notice:</strong> This password reset link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email and your password will remain unchanged.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 32px; text-align: center; background-color: #fafafa; border-top: 1px solid #eeeeee;">
              <p style="color: #999999; font-size: 13px; margin: 0 0 8px; line-height: 1.5;">
                Need help? Contact us at <a href="mailto:support@tone2vibe.in" style="color: #1a1a1a; text-decoration: none; font-weight: 500;">support@tone2vibe.in</a>
              </p>
              <p style="color: #b3b3b3; font-size: 12px; margin: 0;">
                &copy; ${new Date().getFullYear()} Tone2Vibe. All rights reserved.
              </p>
            </td>
          </tr>

        </table>

        <!-- Bottom Spacer Text -->
        <p style="color: #999999; font-size: 12px; margin: 24px 0 0; text-align: center; line-height: 1.5;">
          You're receiving this email because a password reset was requested for your account.<br>
          www.tone2vibe.in
        </p>

      </td>
    </tr>
  </table>
</body>
</html>`;
}


/* -----------------------------------------------------------
   STRICT CORS (FINAL FIX — NO MORE ERRORS)
----------------------------------------------------------- */
function getCorsHeaders(origin: string | null) {
  const allowedOrigins = [
    'http://localhost:8080',
    'https://preview--tone2vibe-51.lovable.app',
    'https://tone-to-vibe-speak-51.vercel.app',
    'https://tone2vibe.in',
  ];

  const isAllowed = allowedOrigins.includes(origin || '');

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin! : '',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  };
}


/* -----------------------------------------------------------
   MAIN FUNCTION
----------------------------------------------------------- */
Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);
  
  // OPTIONS — Preflight OK
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
      status: 204
    });
  }

  try {
    // Ensure server ENV is set
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const brevoApiKey = Deno.env.get('BREVO_API_KEY');

    if (!supabaseUrl || !supabaseKey || !brevoApiKey) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Parse JSON
    const { email } = await req.json() as PasswordResetRequest;
    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Find user
    const { data: usersData } = await supabase.auth.admin.listUsers();
    const user = usersData?.users?.find(u => u.email?.toLowerCase() === normalizedEmail);

    // Always respond success (anti-enumeration)
    if (!user) {
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create token
    const resetToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    await supabase.from('password_reset_tokens').insert({
      user_id: user.id,
      email: normalizedEmail,
      token: resetToken,
      expires_at: expiresAt,
    });

    // Reset link
    const resetUrl = `${origin}/reset-password?token=${resetToken}`;

    // Fetch user name
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', user.id)
      .single();

    const fullName = profile?.full_name || normalizedEmail.split('@')[0];

    // Send email
    await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': brevoApiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: 'Tone2Vibe', email: 'yadavakhilesh2519@gmail.com' },
        to: [{ email: normalizedEmail, name: fullName }],
        subject: 'Reset Your Password – Tone2Vibe',
        htmlContent: getPasswordResetEmailTemplate(fullName, resetUrl)
      })
    });

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
