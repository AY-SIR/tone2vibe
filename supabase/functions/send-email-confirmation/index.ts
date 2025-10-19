import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface EmailConfirmationRequest {
  email: string;
  userId: string;
  fullName?: string;
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

    const { email, userId, fullName } = await req.json() as EmailConfirmationRequest;

    if (!email || !userId) {
      return new Response(
        JSON.stringify({ error: 'Email and userId are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: tokenData, error: tokenError } = await supabaseClient
      .rpc('generate_verification_token');

    if (tokenError) {
      console.error('Token generation error:', tokenError);
      return new Response(
        JSON.stringify({ error: 'Failed to generate verification token' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const verificationToken = tokenData;

    const { error: insertError } = await supabaseClient
      .from('email_verification_tokens')
      .insert({
        user_id: userId,
        email: email,
        token: verificationToken,
        token_type: 'email_confirmation',
      });

    if (insertError) {
      console.error('Token insert error:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to store verification token' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const confirmationUrl = `${Deno.env.get('SITE_URL') || 'https://tone2vibe.in'}/email-confirmation?token=${verificationToken}`;

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
          name: fullName || email.split('@')[0],
        }],
        subject: 'Confirm Your Email - Tone2Vibe',
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
                        <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">Welcome to Tone2Vibe!</h1>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 40px 30px;">
                        <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">Hi ${fullName || 'there'},</p>
                        <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">Thank you for signing up! Please confirm your email address to complete your registration and start using Tone2Vibe.</p>
                        <div style="text-align: center; margin: 30px 0;">
                          <a href="${confirmationUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-size: 16px; font-weight: bold;">Confirm Email</a>
                        </div>
                        <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 20px 0 0;">If the button doesn't work, copy and paste this link into your browser:</p>
                        <p style="color: #667eea; font-size: 14px; word-break: break-all; margin: 10px 0;">${confirmationUrl}</p>
                        <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 20px 0 0;">This link will expire in 24 hours.</p>
                      </td>
                    </tr>
                    <tr>
                      <td style="background-color: #f8f9fa; padding: 20px 30px; border-top: 1px solid #e9ecef;">
                        <p style="color: #999999; font-size: 12px; line-height: 1.6; margin: 0;">If you didn't create an account, please ignore this email.</p>
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
        JSON.stringify({ error: 'Failed to send confirmation email' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Confirmation email sent successfully',
        token: verificationToken
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in send-email-confirmation:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});