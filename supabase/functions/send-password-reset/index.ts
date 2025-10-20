import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://tone2vibe.in', // frontend URL
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, X-Client-Info, ApiKey, Content-Type',
  'Access-Control-Max-Age': '86400',
};

interface PasswordResetRequest {
  email: string;
}

Deno.serve(async (req: Request) => {
  console.log('=== PASSWORD RESET REQUEST START ===');
  console.log('Method:', req.method);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Parse request
    const { email } = await req.json() as PasswordResetRequest;

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch user by email
    const { data: userData, error: userError } = await supabaseClient.auth.admin.listUsers();
    if (userError) throw userError;

    const user = userData?.users?.find((u) => u.email === email);

    // Always respond with success message to avoid email enumeration
    if (!user) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'If an account exists with this email, a password reset link has been sent.' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate token via RPC
    const { data: tokenData, error: tokenError } = await supabaseClient.rpc('generate_verification_token');
    if (tokenError) throw tokenError;

    const resetToken = tokenData;

    // Store token in DB
    const { error: insertError } = await supabaseClient
      .from('password_reset_tokens')
      .insert({
        user_id: user.id,
        email: email,
        token: resetToken,
      });
    if (insertError) throw insertError;

    // Build reset URL
    const protocol = req.headers.get('x-forwarded-proto') || 'https';
    const host = req.headers.get('host') || 'tone2vibe.in';
    const resetUrl = `${protocol}://${host}/reset-password?token=${resetToken}`;

    // Fetch full name from profiles
    const { data: profileData } = await supabaseClient
      .from('profiles')
      .select('full_name')
      .eq('user_id', user.id)
      .single();

    const fullName = profileData?.full_name || email.split('@')[0];

    // Brevo API key
    const brevoApiKey = Deno.env.get('BREVO_API_KEY');
    if (!brevoApiKey) throw new Error('Email service not configured');

    // Send reset email via Brevo
    const emailResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': brevoApiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: 'Tone2Vibe', email: 'yadavakhilesh2519@gmail.com' },
        to: [{ email, name: fullName }],
        subject: 'Reset Your Password - Tone2Vibe',
        htmlContent: `
           <!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Reset Your Password - Tone2Vibe</title>
  <!--[if mso]>
  <style type="text/css">
    table {border-collapse: collapse;}
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0a0a0a; -webkit-font-smoothing: antialiased; width: 100% !important;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="background-color: #0a0a0a; min-height: 100vh;">
    <tr>
      <td align="center" style="padding: 40px 15px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff;">

          <!-- Header -->
          <tr>
            <td style="padding: 50px 40px; text-align: center; background-color: #000000; border-bottom: 1px solid #e5e5e5;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
              <tr>
  <td align="center" style="vertical-align: middle;">
    <table cellpadding="0" cellspacing="0" border="0" role="presentation" style="display: inline-block;">
      <tr>
        <!-- Icon Circle -->
        <td style="vertical-align: middle; padding-right: 15px;">
          <div style="width: 70px; height: 70px; background: linear-gradient(135deg, #ffffff 0%, #e5e5e5 100%); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 8px 25px rgba(255,255,255,0.2); border: 3px solid rgba(255,255,255,0.1);">
            <img src="https://res.cloudinary.com/dcrfzlqak/image/upload/v1758802751/favicon_yoag75.png" alt="Tone2Vibe" width="38" height="38" style="display: block;" />
          </div>
        </td>

        <!-- Text -->
        <td style="vertical-align: middle;">
          <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 300; letter-spacing: 2px; text-transform: uppercase; white-space: nowrap; line-height: 1;">
            Password Reset
          </h1>
        </td>
      </tr>
    </table>
  </td>
</tr>

                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 50px 40px;">
              <p style="color: #000000; font-size: 18px; line-height: 1.8; margin: 0 0 20px; font-weight: 400;">Hello <strong style="font-weight: 600;">${fullName}</strong>,</p>

              <p style="color: #333333; font-size: 16px; line-height: 1.9; margin: 0 0 35px; font-weight: 300;">
                We received a request to reset your password. Click the button below to set a new password for your Tone2Vibe account.
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
                <tr>
                  <td align="center" style="padding: 0 0 40px;">
                    <a href="${resetUrl}" style="display: inline-block; background-color: #000000; color: #ffffff; text-decoration: none; padding: 18px 50px; font-size: 14px; font-weight: 500; letter-spacing: 1.5px; text-transform: uppercase; border: 2px solid #000000;">Reset Password</a>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <div style="height: 1px; background-color: #e5e5e5; margin: 35px 0;"></div>

              <!-- Security Info -->
              <div style="background-color: #fafafa; padding: 25px; border: 1px solid #e5e5e5;">
                <p style="color: #000000; font-size: 14px; line-height: 1.8; margin: 0 0 12px; font-weight: 600;">
                  Security Information
                </p>
                <p style="color: #666666; font-size: 14px; line-height: 1.8; margin: 0 0 12px; font-weight: 300;">
                  This link expires in <strong style="color: #000000; font-weight: 500;">1 hour</strong>.
                </p>
                <p style="color: #666666; font-size: 14px; line-height: 1.8; margin: 0; font-weight: 300;">
                  If you didn't request this, you can safely ignore this email.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #000000; padding: 35px 40px; border-top: 1px solid #e5e5e5;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
                <tr>
                  <td align="center">
                    <p style="color: #ffffff; font-size: 16px; line-height: 1.6; margin: 0 0 8px; font-weight: 300; letter-spacing: 2px; ;">Tone2Vibe.in</p>
                    <p style="color: #999999; font-size: 12px; line-height: 1.6; margin: 0; font-weight: 300;">
                      &copy; ${new Date().getFullYear()} All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>

        <!-- Legal Text -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="max-width: 600px; width: 100%; margin-top: 25px;">
          <tr>
            <td align="center" style="padding: 0 15px;">
              <p style="color: #666666; font-size: 11px; line-height: 1.7; margin: 0; font-weight: 300;">
                This is an automated message from Tone2Vibe. Please do not reply to this email.
              </p>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>

  <!-- Mobile Responsive Styles -->
  <style type="text/css">
    @media only screen and (max-width: 600px) {
      .header-content {
        display: block !important;
      }
      .header-icon {
        display: block !important;
        margin: 0 auto 15px !important;
        padding-right: 0 !important;
      }
      .header-text {
        display: block !important;
        text-align: center !important;
      }
      h1 {
        font-size: 24px !important;
        white-space: normal !important;
      }
      .content-padding {
        padding: 30px 25px !important;
      }
      .header-padding {
        padding: 35px 25px !important;
      }
      .footer-padding {
        padding: 25px 25px !important;
      }
    }
  </style>
</body>
</html> `,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error('Brevo API error:', errorText);
      throw new Error('Failed to send password reset email');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'If an account exists with this email, a password reset link has been sent.' 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in password reset:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
