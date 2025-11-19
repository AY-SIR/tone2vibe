import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(req);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const brevoApiKey = Deno.env.get('BREVO_API_KEY');

    if (!supabaseUrl || !supabaseKey) {
      // ❌ 500 Error - throw to be caught below
      throw new Error('Server configuration error');
    }

    const supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    let email, password, fullName;
    try {
      const body = await req.json();
      email = body.email;
      password = body.password;
      fullName = body.fullName;
    } catch (e) {
      // ❌ 400 Error - throw to be caught below
      throw new Error('Invalid request body');
    }

    if (!email || !password) {
      // ❌ 400 Error - throw to be caught below
      throw new Error('Email and password are required');
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user exists
    const { data: usersData, error: listError } = await supabaseClient.auth.admin.listUsers();
    if (listError) {
      throw new Error('Failed to verify user status');
    }

    const existingUser = usersData?.users?.find((u) => u.email?.toLowerCase() === normalizedEmail);
    if (existingUser) {
      // ❌ 409 Conflict - throw with specific message
      throw new Error('An account with this email already exists');
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
      throw new Error('Failed to create user');
    }

    const userId = userData.user.id;

    // Generate verification token
    const verificationToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    // Store token
    const { error: insertError } = await supabaseClient.from('email_verification_tokens').insert({
      user_id: userId,
      email: normalizedEmail,
      token: verificationToken,
      token_type: 'email_confirmation',
      expires_at: expiresAt
    });

    if (insertError) {
      await supabaseClient.auth.admin.deleteUser(userId);
      throw new Error('Failed to create verification token');
    }

    // Send email via Brevo
    if (brevoApiKey) {
      const requestOrigin = req.headers.get('origin') || 'https://tone2vibe.in';
      const confirmationUrl = `${requestOrigin}/email-confirmation?token=${verificationToken}`;
      const displayName = fullName || email.split('@')[0];

      const emailHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirm Your Email</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif; background: linear-gradient(135deg, #f5f7fa 0%, #e8eef3 100%);">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="padding: 10px 5px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 560px; background-color: #ffffff; border-radius: 20px; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06); overflow: hidden;">
          <tr>
            <td style="padding: 48px 32px 24px; background: linear-gradient(180deg, #fafafa 0%, #ffffff 100%); text-align: center;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
                <tr>
                  <td style="padding-right: 10px; vertical-align: middle;">
                    <img src="https://res.cloudinary.com/dcrfzlqak/image/upload/v1758802751/favicon_yoag75.png"
                         alt="Tone2Vibe"
                         draggable="false"
                         width="40"
                         height="40"
                         style="display: block; border-radius: 8px;" />
                  </td>
                  <td style="vertical-align: middle;">
                    <span style="font-size: 22px; font-weight: 600; color: #111111; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;">
                      Tone2Vibe
                    </span>
                  </td>
                </tr>
              </table>
              <div style="width: 100%; height: 1px; background: linear-gradient(to right, #e6e6e6, #f7f7f7); margin: 24px 0 20px;"></div>
              <h1 style="color: #1a1a1a; margin: 0; font-weight: 700; letter-spacing: -0.5px; text-align: center; font-size: 22px;">
                Confirm Your Email
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 32px;">
              <p style="color: #1a1a1a; font-size: 16px; line-height: 1.6; margin: 0 0 8px; font-weight: 500;">
                Hi ${displayName},
              </p>
              <p style="color: #666666; font-size: 15px; line-height: 1.7; margin: 0 0 32px;">
                Welcome to Tone2Vibe! Please confirm your email address by clicking the button below.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding: 0 0 32px;">
                    <a href="${confirmationUrl}" style="display: inline-block; background-color: #1a1a1a; color: #ffffff; text-decoration: none; padding: 16px 48px; font-size: 15px; font-weight: 600; border-radius: 10px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);">
                      Confirm Email
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 32px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #fff8e6; border-left: 4px solid #f59e0b; border-radius: 8px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="color: #92400e; font-size: 13px; line-height: 1.6; margin: 0;">
                      <strong style="color: #78350f;">⚡ Quick Tip:</strong> This confirmation link will expire in 24 hours. If you didn't create this account, you can safely ignore this email.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
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
        <p style="color: #999999; font-size: 12px; margin: 24px 0 0; text-align: center; line-height: 1.5;">
          You're receiving this email because an account was created with this email address.<br>
          www.tone2vibe.in
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;

      try {
        const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
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

        if (!brevoResponse.ok) {
          const errorText = await brevoResponse.text();
          // Email failed but don't block signup - just log
          console.error(`Brevo API error: ${brevoResponse.status} - ${errorText}`);
        }
      } catch (emailError) {
        // Email failed but user is created - silent fail
        console.error('Email send failed:', emailError);
      }
    }

    // ✅ SUCCESS - Return 200 with success response
    return new Response(JSON.stringify({
      success: true,
      userId,
      message: 'Account created successfully! Please check your email to confirm.'
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });

  } catch (err: any) {
    // ❌ ERROR - Return error details in response
    const errorMessage = err.message || 'Internal server error';

    // Determine appropriate status code
    let statusCode = 500;
    if (errorMessage.includes('already exists')) {
      statusCode = 409; // Conflict
    } else if (
      errorMessage.includes('Invalid request') ||
      errorMessage.includes('Email and password are required')
    ) {
      statusCode = 400; // Bad Request
    }

    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), {
      status: statusCode,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});