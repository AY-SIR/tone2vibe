import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

interface PasswordResetRequest {
  email: string;
}

// Email template function
function getPasswordResetEmailTemplate(fullName: string, resetUrl: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif; background: linear-gradient(135deg, #f5f7fa 0%, #e8eef3 100%); ">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="padding: 30px 2px;">
    <tr>
      <td align="center">
        <!-- Main Container -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 560px; background-color: #ffffff; border-radius: 20px; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06); overflow: hidden;">
          
          <!-- Header with Logo -->
          <tr>
            <td style="padding: 48px 12px 12px; background: linear-gradient(180deg, #fafafa 0%, #ffffff 100%);">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center">
                    <div style="display: inline-flex; align-items: center; gap: 16px;">
                      <img src="https://res.cloudinary.com/dcrfzlqak/image/upload/v1758802751/favicon_yoag75.png"
                           alt="Tone2Vibe" width="48" height="48" style="border-radius: 10px;" />
                      <h1 style="color: #1a1a1a; margin: 0; font-size: 24px; font-weight: 600; letter-spacing: -0.5px;">
                        Reset Your Password
                      </h1>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 32px 32px 32px;">
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
                    <a href="${resetUrl}" style="display: inline-block; background-color: #1a1a1a; color: #ffffff; text-decoration: none; padding: 15px 48px; font-size: 15px; font-weight: 600; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15); transition: all 0.2s;">
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
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8f9fa; border-left: 3px solid #1a1a1a; border-radius: 6px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="color: #666666; font-size: 13px; line-height: 1.6; margin: 0;">
                      <strong style="color: #1a1a1a;">Security Notice:</strong> This password reset link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email and your password will remain unchanged.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 32px 48px; text-align: center; background-color: #fafafa; border-top: 1px solid #eeeeee;">
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
          Tone2Vibe, Inc.
        </p>

      </td>
    </tr>
  </table>
</body>
</html>`;
}

// Fixed CORS headers function
function getCorsHeaders(origin: string | null) {
  const allowedOrigins = ['https://tone2vibe.in', 'http://localhost:8000'];
  const validOrigin = allowedOrigins.includes(origin || '') ? origin : '';
  return {
    'Access-Control-Allow-Origin': validOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Max-Age': '86400',
  };
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const brevoApiKey = Deno.env.get('BREVO_API_KEY');

    if (!supabaseUrl || !supabaseKey || !brevoApiKey) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { email } = await req.json() as PasswordResetRequest;
    if (!email) throw new Error('Email is required');

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user exists
    const { data: usersData, error: listError } = await supabaseClient.auth.admin.listUsers();
    if (listError) throw listError;

    const user = usersData?.users?.find(u => u.email?.toLowerCase() === normalizedEmail);

    // Always respond with success message to prevent email enumeration
    if (!user) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'If an account exists with this email, a password reset link has been sent.'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate reset token
    const resetToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour expiry

    // Store token in DB
    const { error: insertError } = await supabaseClient
      .from('password_reset_tokens')
      .insert({ user_id: user.id, email: normalizedEmail, token: resetToken, expires_at: expiresAt });
    if (insertError) throw insertError;

    const originHeader = req.headers.get('origin') || 'https://tone2vibe.in';
    const resetUrl = `${originHeader}/reset-password?token=${resetToken}`;

    // Fetch user full name from profiles
    const { data: profileData } = await supabaseClient
      .from('profiles')
      .select('full_name')
      .eq('user_id', user.id)
      .single();
    const fullName = profileData?.full_name || normalizedEmail.split('@')[0];

    // Send email with template
    try {
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
          subject: 'Reset Your Password - Tone2Vibe',
          htmlContent: getPasswordResetEmailTemplate(fullName, resetUrl)
        })
      });
    } catch (emailError) {
      // Email error - silent fail
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
