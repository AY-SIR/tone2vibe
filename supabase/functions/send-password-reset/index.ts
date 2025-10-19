import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface PasswordResetRequest {
  email: string;
}

// Helper function for consistent success response
const sendSuccessResponse = () => {
  return new Response(
    JSON.stringify({
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent.',
    }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
};

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

    // Get critical env variables
    const requestUrl = new URL(req.url);
    const siteUrl = Deno.env.get('SITE_URL') ?? `${requestUrl.protocol}//${requestUrl.host}`;
    const brevoApiKey = Deno.env.get('BREVO_API_KEY');

    if (!brevoApiKey) {
      console.error('BREVO_API_KEY environment variable is not set.');
      throw new Error('Server configuration error: BREVO_API_KEY not set.');
    }

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

    // FIX: My previous suggestion was wrong. `getUserByEmail` is not a function.
    // The *correct* and *most efficient* way is to query the auth.users table directly.
    // This is secure because you are using your SERVICE_ROLE_KEY.
    const { data: userData, error: userError } = await supabaseClient
      .from('auth.users') // Query the auth schema's user table
      .select('id')       // We just need the user's ID
      .eq('email', email) // Find the user by their email
      .single();          // Expect only one or zero results

    // FIX: If userError (like "PGRST116: No rows found"), we DON'T return an error.
    // We send the success response to prevent email enumeration.
    if (userError) {
      console.warn(`Password reset attempt for non-existent email: ${email}`);
      return sendSuccessResponse();
    }
    
    // We have a user. Reconstruct the simple 'user' object for the next steps.
    const user = { id: userData.id, email: email };

    const { data: tokenData, error: tokenError } = await supabaseClient
      .rpc('generate_verification_token');

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

    const resetUrl = `${siteUrl}/reset-password?token=${resetToken}`;

    const { data: profileData } = await supabaseClient
      .from('profiles')
      .select('full_name')
      .eq('user_id', user.id)
      .single();

    const fullName = profileData?.full_name || email.split('@')[0];

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
          <!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Reset Your Password - Tone2Vibe</title>
  </head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0a0a0a; -webkit-font-smoothing: antialiased; width: 100% !important;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="background-color: #0a0a0a; min-height: 100vh;">
    <tr>
      <td align="center" style="padding: 40px 15px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff;">

          <tr class="header-padding">
            <td style="padding: 50px 40px; text-align: center; background-color: #000000; border-bottom: 1px solid #e5e5e5;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
                <tr>
                  <td align="center" style="vertical-align: middle;">
                    <table cellpadding="0" cellspacing="0" border="0" role="presentation" class="header-content" style="display: inline-block;">
                      <tr>
                        <td class="header-icon" style="vertical-align: middle; padding-right: 20px;">
                          <div style="width: 60px; height: 60px; background-color: #ffffff; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M12 2C9.243 2 7 4.243 7 7v3H6c-1.103 0-2 .897-2 2v8c0 1.103.897 2 2 2h12c1.103 0 2-.897 2-2v-8c0-1.103-.897-2-2-2h-1V7c0-2.757-2.243-5-5-5zM9 7c0-1.654 1.346-3 3-3s3 1.346 3 3v3H9V7z" fill="#000000"/>
                            </svg>
                          </div>
                        </td>
                        <td class="header-text" style="vertical-align: middle;">
                          <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 300; letter-spacing: 2px; text-transform: uppercase; white-space: nowrap;">Password Reset</h1>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr class="content-padding">
            <td style="padding: 50px 40px;">
              <p style="color: #000000; font-size: 18px; line-height: 1.8; margin: 0 0 20px; font-weight: 400;">Hello <strong style="font-weight: 600;">${fullName}</strong>,</p>

              <p style="color: #333333; font-size: 16px; line-height: 1.9; margin: 0 0 35px; font-weight: 300;">
                We received a request to reset your password. Click the button below to set a new password for your Tone2Vibe account.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
                <tr>
                  <td align="center" style="padding: 0 0 40px;">
                    <a href="${resetUrl}" style="display: inline-block; background-color: #000000; color: #ffffff; text-decoration: none; padding: 18px 50px; font-size: 14px; font-weight: 500; letter-spacing: 1.5px; text-transform: uppercase; border: 2px solid #000000;">Reset Password</a>
                  </td>
                </tr>
              </table>

              <div style="height: 1px; background-color: #e5e5e5; margin: 35px 0;"></div>

              <div style="background-color: #fafafa; padding: 25px; border: 1px solid #e5e5e5; border-radius: 8px; overflow: hidden;">
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

          <tr class="footer-padding">
            <td style="background-color: #000000; padding: 35px 40px; border-top: 1px solid #e5e5e5;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
                <tr>
                  <td align="center">
                    <p style="color: #ffffff; font-size: 16px; line-height: 1.6; margin: 0 0 8px; font-weight: 300; letter-spacing: 2px; text-transform: uppercase;">Tone2Vibe</p>
                    <p style="color: #999999; font-size: 12px; line-height: 1.6; margin: 0; font-weight: 300;">
                      &copy; ${new Date().getFullYear()} All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>

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

  <style type="text/css">
    @media only screen and (max-width: 600px) {
      .header-content {
        display: block !important;
        width: 100% !important;
      }
      .header-icon {
        display: block !important;
        margin: 0 auto 15px !important;
        padding-right: 0 !important;
        text-align: center !important;
      }
      .header-text {
        display: block !important;
        text-align: center !important;
      }
      h1 {
        font-size: 24px !important;
        white-space: normal !importa
      }
      .content-padding {
        /* Use the class selector for padding */
      }
      td[class="content-padding"] {
        padding: 30px 25px !important;
      }
      td[class="header-padding"] {
        padding: 35px 25px !important;
      }
      td[class="footer-padding"] {
        padding: 25px 25px !important;
      }
    }
  </style>
</body>
</html>
        `,
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

    // Use the consistent success response
    return sendSuccessResponse();

  } catch (error) {
    console.error('Error in send-password-reset:', error);
    // Don't leak internal error messages to the user
    return new Response(
      JSON.stringify({ error: 'An internal server error occurred' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
        
