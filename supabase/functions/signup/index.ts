import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
};

Deno.serve(async (req) => {
  console.log('=== REQUEST START ===');
  console.log('Method:', req.method);
  console.log('Headers:', Object.fromEntries(req.headers.entries()));

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS preflight');
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  try {
    // Check environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const brevoApiKey = Deno.env.get('BREVO_API_KEY');

    console.log('Environment check:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseKey,
      hasBrevo: !!brevoApiKey
    });

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing environment variables');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Parse request body
    let email, password, fullName;
    try {
      const body = await req.json();
      email = body.email;
      password = body.password;
      fullName = body.fullName;

      console.log('Parsed body:', {
        email,
        password: password ? '***' : undefined,
        fullName
      });
    } catch (e) {
      console.error('JSON parse error:', e);
      return new Response(
        JSON.stringify({
          error: 'Invalid request body',
          details: e.message
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (!email || !password) {
      console.error('Missing required fields:', {
        hasEmail: !!email,
        hasPassword: !!password
      });
      return new Response(
        JSON.stringify({
          error: 'Email and password are required',
          received: { email: !!email, password: !!password, fullName: !!fullName }
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    console.log('Normalized email:', normalizedEmail);

    // Check if user exists
    console.log('Checking for existing users...');
    const { data: usersData, error: listError } = await supabaseClient.auth.admin.listUsers();

    if (listError) {
      console.error('List users error:', listError);
      return new Response(
        JSON.stringify({
          error: 'Failed to verify user status',
          details: listError.message
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const existingUser = usersData?.users?.find(
      u => u.email?.toLowerCase() === normalizedEmail
    );

    if (existingUser) {
      console.log('User already exists:', normalizedEmail);
      return new Response(
        JSON.stringify({ error: 'User already exists' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Create user
    console.log('Creating new user...');
    const { data: userData, error: createError } = await supabaseClient.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: false,
      user_metadata: {
        full_name: fullName || email.split('@')[0]
      }
    });

    if (createError || !userData?.user) {
      console.error('Create user error:', createError);
      return new Response(
        JSON.stringify({
          error: 'Failed to create user',
          details: createError?.message
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const userId = userData.user.id;
    console.log('User created successfully:', userId);

    // Generate verification token
    const verificationToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    console.log('Generated token:', verificationToken);

    // Store token
    console.log('Storing verification token...');
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
      console.error('Token insert error:', insertError);

      // Try to delete the created user
      await supabaseClient.auth.admin.deleteUser(userId);
      console.log('Rolled back user creation');

      return new Response(
        JSON.stringify({
          error: 'Failed to create verification token',
          details: insertError.message
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Token stored successfully');

    // Send email via Brevo
    if (!brevoApiKey) {
      console.error('BREVO_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const origin = req.headers.get('origin') || 'https://tone2vibe.in';
    const confirmationUrl = `${origin}/email-confirmation?token=${verificationToken}`;
    const displayName = fullName || email.split('@')[0];

    console.log('Sending confirmation email...');
    console.log('Confirmation URL:', confirmationUrl);

    const emailHtml = `
      <!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Verify Your Email - Tone2Vibe</title>
  <!--[if mso]>
  <style type="text/css">
    table {border-collapse: collapse;}
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', 'Arial', sans-serif; background-color: #000000; -webkit-font-smoothing: antialiased; width: 100% !important;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="background-color: #000000; min-height: 100vh;">
    <tr>
      <td align="center" style="padding: 60px 15px;">

        <!-- Outer Border Frame -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="max-width: 650px; width: 100%; background: linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%); padding: 2px; box-shadow: 0 20px 60px rgba(255, 255, 255, 0.05);">
          <tr>
            <td>
              <!-- Inner Content -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="background-color: #ffffff;">

                <!-- Decorative Top Border -->
                <tr>
                  <td style="height: 4px; background: linear-gradient(90deg, #000000 0%, #666666 50%, #000000 100%);"></td>
                </tr>

                <!-- Header -->
                <tr>
                  <td style="padding: 60px 60px; text-align: center; background: linear-gradient(180deg, #000000 0%, #1a1a1a 100%);">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
                      <tr>
                        <td align="center">
                          <table cellpadding="0" cellspacing="0" border="0" role="presentation" style="display: inline-block;">
                            <tr>
                              <td style="vertical-align: middle; padding-right: 25px;">
                                <div style="width: 70px; height: 70px; background: linear-gradient(135deg, #ffffff 0%, #e5e5e5 100%); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 10px 30px rgba(255, 255, 255, 0.2); border: 3px solid rgba(255, 255, 255, 0.1);">
                                  <img src="https://res.cloudinary.com/dcrfzlqak/image/upload/v1758802751/favicon_yoag75.png" alt="Tone2Vibe" width="38" height="38" style="display: block;" />
                                </div>
                              </td>
                              <td style="vertical-align: middle;">
                                <h1 style="color: #ffffff; margin: 0; font-size: 38px; font-weight: 200; letter-spacing: 4px; text-transform: uppercase; white-space: nowrap;">Confirm Email</h1>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    <div style="width: 60px; height: 1px; background: linear-gradient(90deg, transparent, #ffffff, transparent); margin: 25px auto 0; opacity: 0.3;"></div>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 60px 60px;">
                    <p style="color: #000000; font-size: 19px; line-height: 1.7; margin: 0 0 20px; font-weight: 300; letter-spacing: 0.3px;">Hello <strong style="font-weight: 500;">${displayName}</strong>,</p>

                    <p style="color: #333333; font-size: 16px; line-height: 1.9; margin: 0 0 15px; font-weight: 300; letter-spacing: 0.2px;">
                      Thank you for signing up for Tone2Vibe.
                    </p>

                    <p style="color: #333333; font-size: 16px; line-height: 1.9; margin: 0 0 40px; font-weight: 300; letter-spacing: 0.2px;">
                      Please confirm your email address to activate your account and start using our voice to text conversion service.
                    </p>

                    <!-- CTA Button -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
                      <tr>
                        <td align="center" style="padding: 0 0 45px;">
                          <table cellpadding="0" cellspacing="0" border="0" role="presentation">
                            <tr>
                              <td style="background: linear-gradient(135deg, #000000 0%, #2a2a2a 100%); box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);">
                                <a href="${confirmationUrl}" style="display: block; color: #ffffff; text-decoration: none; padding: 20px 65px; font-size: 13px; font-weight: 500; letter-spacing: 2.5px; text-transform: uppercase; border: 1px solid rgba(255, 255, 255, 0.1);">Confirm Email</a>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <!-- Decorative Divider -->
                    <div style="text-align: center; margin: 40px 0;">
                      <div style="display: inline-block; width: 100%; max-width: 200px; height: 1px; background: linear-gradient(90deg, transparent, #cccccc, transparent);"></div>
                    </div>

                    <!-- Security Info Box -->
                    <div style="background: linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%); padding: 32px; border-left: 3px solid #000000; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.03);">
                      <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
                        <tr>
                          <td style="vertical-align: top; width: 30px; padding-right: 15px;">
                            <div style="width: 24px; height: 24px; background-color: #000000; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                              <span style="color: #ffffff; font-size: 14px; font-weight: 600;">i</span>
                            </div>
                          </td>
                          <td style="vertical-align: top;">
                            <p style="color: #000000; font-size: 15px; line-height: 1.8; margin: 0 0 12px; font-weight: 500; letter-spacing: 0.5px;">
                              Important Information
                            </p>
                            <p style="color: #555555; font-size: 14px; line-height: 1.9; margin: 0 0 10px; font-weight: 300;">
                              This verification link will expire in <strong style="color: #000000; font-weight: 500;">24 hours</strong>.
                            </p>
                            <p style="color: #555555; font-size: 14px; line-height: 1.9; margin: 0; font-weight: 300;">
                              If you didn't create an account with Tone2Vibe, you can safely ignore this email.
                            </p>
                          </td>
                        </tr>
                      </table>
                    </div>
                  </td>
                </tr>

                <!-- Decorative Bottom Border -->
                <tr>
                  <td style="height: 1px; background: linear-gradient(90deg, transparent, #cccccc, transparent);"></td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background: linear-gradient(180deg, #1a1a1a 0%, #000000 100%); padding: 45px 60px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
                      <tr>
                        <td align="center">
                          <p style="color: #ffffff; font-size: 18px; line-height: 1.6; margin: 0 0 8px; font-weight: 300; letter-spacing: 3px; ;">Tone2Vibe</p>
                          <div style="width: 40px; height: 1px; background: rgba(255, 255, 255, 0.3); margin: 12px auto;"></div>

                          <p style="color: #666666; font-size: 11px; line-height: 1.6; margin: 0; font-weight: 300; letter-spacing: 0.5px;">
                            &copy; ${new Date().getFullYear()} Tone2Vibe. All rights reserved.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>

        <!-- Legal Text -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="max-width: 650px; width: 100%; margin-top: 30px;">
          <tr>
            <td align="center" style="padding: 0 15px;">
              <p style="color: #666666; font-size: 11px; line-height: 1.8; margin: 0; font-weight: 300; letter-spacing: 0.5px;">
                This is an automated message from Tone2Vibe.in Please do not reply to this email.
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
      .header-icon {
        display: block !important;
        margin: 0 auto 15px !important;
        padding-right: 0 !important;
      }
      .header-text {
        display: block !important;
      }
      h1 {
        font-size: 28px !important;
        letter-spacing: 2px !important;
        white-space: normal !important;
      }
      .content-padding {
        padding: 45px 30px !important;
      }
      .header-padding {
        padding: 45px 30px !important;
      }
      .footer-padding {
        padding: 35px 30px !important;
      }
    }
  </style>
</body>
</html>
    `;

    try {
      const emailResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': brevoApiKey,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          sender: {
            name: 'Tone2Vibe',
            email: 'yadavakhilesh2519@gmail.com'
          },
          to: [{
            email: normalizedEmail,
            name: displayName
          }],
          subject: 'Confirm Your Email - Tone2Vibe',
          htmlContent: emailHtml
        })
      });

      if (!emailResponse.ok) {
        const errText = await emailResponse.text();
        console.error('Brevo API error:', errText);
        throw new Error('Failed to send email');
      }

      console.log('Email sent successfully');
    } catch (emailError) {
      console.error('Email send error:', emailError);
      // Don't fail the signup, just log the error
    }

    console.log('=== SUCCESS ===');
    return new Response(
      JSON.stringify({
        success: true,
        userId,
        message: 'Account created successfully! Please check your email to confirm.'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (err) {
    console.error('=== ERROR ===');
    console.error('Edge Function error:', err);
    console.error('Stack:', err.stack);

    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : 'Internal server error',
        type: err.constructor.name
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});