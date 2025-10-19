import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface PasswordResetRequest {
  email: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { email } = await req.json() as PasswordResetRequest;

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Fetch all users and find the matching email
    const { data: userData, error: userError } = await supabaseClient.auth.admin.listUsers();
    if (userError) throw userError;

    const user = userData?.users?.find((u) => u.email === email);

    if (!user) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'If an account exists with this email, a password reset link has been sent.' 
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Generate token via RPC
    const { data: tokenData, error: tokenError } = await supabaseClient.rpc('generate_verification_token');
    if (tokenError) {
      console.error('Token generation error:', tokenError);
      return new Response(
        JSON.stringify({ error: 'Failed to generate reset token' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const resetToken = tokenData;

    // Store token in DB
    const { error: insertError } = await supabaseClient
      .from('password_reset_tokens')
      .insert({
        user_id: user.id,
        email: email,
        token: resetToken,
      });
    if (insertError) {
      console.error('Token insert error:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to store reset token' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Auto-detect site URL
    const protocol = req.headers.get('x-forwarded-proto') || 'https';
    const host = req.headers.get('host') || 'tone2vibe.in';
    const resetUrl = `${protocol}://${host}/reset-password?token=${resetToken}`;

    // Brevo API key
    const brevoApiKey = Deno.env.get('BREVO_API_KEY');
    if (!brevoApiKey) {
      console.error('BREVO_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Fetch user's full name from profiles
    const { data: profileData } = await supabaseClient
      .from('profiles')
      .select('full_name')
      .eq('user_id', user.id)
      .single();

    const fullName = profileData?.full_name || email.split('@')[0];

    // Send email via Brevo
    const emailResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': brevoApiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: {
          name: 'Tone2Vibe',
          email: 'yadavakhilesh2519@gmail.com',
        },
        to: [{
          email: email,
          name: fullName,
        }],
        subject: 'Reset Your Password - Tone2Vibe',
        htmlContent: `
          <html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Reset Your Password - Tone2Vibe</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9f9f9; width: 100% !important;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="min-height: 100vh; background-color: #f9f9f9;">
    <tr>
      <td align="center" style="padding: 40px 15px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          
          <!-- Header -->
          <tr>
            <td style="padding: 40px 30px; text-align: center; background-color: #ffffff; border-bottom: 1px solid #e5e5e5;">
              <img src="https://res.cloudinary.com/dcrfzlqak/image/upload/v1758802751/favicon_yoag75.png" width="60" height="60" alt="Tone2Vibe Logo" style="display: block; margin: 0 auto 15px;">
              <h1 style="color: #000000; margin: 0; font-size: 28px; font-weight: 600; letter-spacing: 1px;">Password Reset</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #000000; font-size: 18px; line-height: 1.6; margin: 0 0 20px;">Hello <strong style="font-weight: 600;">${fullName}</strong>,</p>
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 35px;">
                We received a request to reset your password. Click the button below to set a new password for your Tone2Vibe account.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
                <tr>
                  <td align="center" style="padding-bottom: 40px;">
                    <a href="${resetUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #000000; color: #ffffff; text-decoration: none; padding: 16px 45px; font-size: 14px; font-weight: 500; letter-spacing: 1px; text-transform: uppercase; border-radius: 4px;">Reset Password</a>
                  </td>
                </tr>
              </table>

              <div style="height: 1px; background-color: #e5e5e5; margin: 35px 0;"></div>

              <div style="background-color: #f4f4f4; padding: 20px; border-radius: 6px; border: 1px solid #e5e5e5;">
                <p style="color: #000000; font-size: 14px; font-weight: 600; margin: 0 0 8px;">Security Information</p>
                <p style="color: #555555; font-size: 14px; margin: 0 0 8px;">
                  This link expires in <strong style="font-weight: 500;">1 hour</strong>.
                </p>
                <p style="color: #555555; font-size: 14px; margin: 0;">
                  If you didn't request this, you can safely ignore this email.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #ffffff; padding: 30px; border-top: 1px solid #e5e5e5; text-align: center;">
              <p style="color: #000000; font-size: 16px; margin: 0 0 8px; font-weight: 500; letter-spacing: 1px;">Tone2Vibe</p>
              <p style="color: #888888; font-size: 12px; margin: 0;">&copy; ${new Date().getFullYear()} All rights reserved.</p>
            </td>
          </tr>

        </table>

        <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="max-width: 600px; width: 100%; margin-top: 20px;">
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

  <style type="text/css">
    @media only screen and (max-width: 600px) {
      h1 { font-size: 24px !important; }
      td { padding: 25px !important; }
    }
  </style>
</body>
</html>        `,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error('Brevo API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to send password reset email' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'If an account exists with this email, a password reset link has been sent.' 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in send-password-reset:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
