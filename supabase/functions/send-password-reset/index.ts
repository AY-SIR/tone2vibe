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
  <title>Reset Your Password - Tone2Vibe</title>
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
      Reset your password
    </h1>

  </td>
</tr>

<!-- Greeting & Info -->
<tr>
  <td style="padding: 0 40px 16px; text-align: center;">
    <p style="color: #666666; font-size: 15px; line-height: 1.5; margin: 0 0 8px;">
      Hi <strong>${fullName}</strong>,
    </p>

    <p style="color: #666666; font-size: 15px; line-height: 1.5; margin: 0 0 32px;">
      We received a request to reset your password. Click the button below to create a new password.
    </p>

    <!-- Button -->
    <a href="${resetUrl}" style="display: inline-block; background-color: #000000; color: #ffffff; text-decoration: none; padding: 12px 32px; font-size: 15px; font-weight: 500; border-radius: 6px;">
      Reset Password
    </a>

    <p style="color: #999999; font-size: 13px; line-height: 1.5; margin: 32px 0 0;">
      This link expires in 1 hour. Didn't request this? Ignore this email.
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