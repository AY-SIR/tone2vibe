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

    const { data: userData, error: userError } = await supabaseClient.auth.admin.listUsers();
    
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

    const resetUrl = `${Deno.env.get('SITE_URL') || 'https://tone2vibe.in'}/reset-password?token=${resetToken}`;

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
          email: 'noreply@tone2vibe.in',
        },
        to: [{
          email: email,
          name: fullName,
        }],
        subject: 'Reset Your Password - Tone2Vibe',
        htmlContent: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
              <tr>
                <td align="center">
                  <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <tr>
                      <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
                        <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">Reset Your Password</h1>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 40px 30px;">
                        <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">Hi ${fullName},</p>
                        <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">We received a request to reset your password for your Tone2Vibe account. Click the button below to create a new password:</p>
                        <div style="text-align: center; margin: 30px 0;">
                          <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-size: 16px; font-weight: bold;">Reset Password</a>
                        </div>
                        <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 20px 0 0;">If the button doesn't work, copy and paste this link into your browser:</p>
                        <p style="color: #667eea; font-size: 14px; word-break: break-all; margin: 10px 0;">${resetUrl}</p>
                        <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 20px 0 0;">This link will expire in 1 hour for security reasons.</p>
                      </td>
                    </tr>
                    <tr>
                      <td style="background-color: #f8f9fa; padding: 20px 30px; border-top: 1px solid #e9ecef;">
                        <p style="color: #999999; font-size: 12px; line-height: 1.6; margin: 0;">If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
                        <p style="color: #999999; font-size: 12px; margin: 10px 0 0;">&copy; ${new Date().getFullYear()} Tone2Vibe. All rights reserved.</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
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