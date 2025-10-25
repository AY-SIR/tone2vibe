import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400'
};
Deno.serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const brevoApiKey = Deno.env.get('BREVO_API_KEY');
    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Server configuration error'
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
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
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid request body'
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    if (!email || !password) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Email and password are required'
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const normalizedEmail = email.trim().toLowerCase();
    // Check if user exists
    const { data: usersData, error: listError } = await supabaseClient.auth.admin.listUsers();
    if (listError) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to verify user status'
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const existingUser = usersData?.users?.find((u)=>u.email?.toLowerCase() === normalizedEmail);
    if (existingUser) {
      return new Response(JSON.stringify({
        success: false,
        error: 'An account with this email already exists'
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
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
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to create user'
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
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
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to create verification token'
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Send email via Brevo
    if (brevoApiKey) {
      const origin = req.headers.get('origin') || 'https://tone2vibe.in';
      const confirmationUrl = `${origin}/email-confirmation?token=${verificationToken}`;
      const displayName = fullName || email.split('@')[0];
      const emailHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirm Your Email</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif; background: linear-gradient(135deg, #f5f7fa 0%, #e8eef3 100%);">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="padding: 30px 2px;">
    <tr>
      <td align="center">
        <!-- Main Container -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 560px; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06); overflow: hidden;">
          
          <!-- Header with Logo -->
          <tr>
            <td style="padding: 32px 24px 24px; background: linear-gradient(180deg, #fafafa 0%, #ffffff 100%);">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center">
                    <div style="display: inline-flex; align-items: center; gap: 6px;">
                      <img src="https://res.cloudinary.com/dcrfzlqak/image/upload/v1758802751/favicon_yoag75.png"
                           alt="Tone2Vibe" width="32" height="32" style="border-radius: 6px;" />
                      <h1 style="color: #1a1a1a; margin: 0; font-size: 28px; font-weight: 600; letter-spacing: -0.5px;">
                        Verify Your Email
                      </h1>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 24px 24px 32px;">
              <p style="color: #1a1a1a; font-size: 16px; line-height: 1.6; margin: 0 0 8px; font-weight: 500;">
                Hi ${displayName},
              </p>
              
              <p style="color: #666666; font-size: 15px; line-height: 1.7; margin: 0 0 32px;">
                Welcome to Tone2Vibe! To get started and secure your account, please confirm your email address by clicking the button below.
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding: 0 0 32px;">
                    <a href="${confirmationUrl}" style="display: inline-block; background-color: #1a1a1a; color: #ffffff; text-decoration: none; padding: 15px 48px; font-size: 15px; font-weight: 600; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15); transition: all 0.2s;">
                      Confirm Email Address
                    </a>
                  </td>
                </tr>
              </table>


            </td>
          </tr>

          <!-- Notice Box -->
          <tr>
            <td style="padding: 0 24px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8f9fa; border-left: 3px solid #1a1a1a; border-radius: 6px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="color: #666666; font-size: 13px; line-height: 1.6; margin: 0;">
                      <strong style="color: #1a1a1a;">Security Notice:</strong> This verification link will expire in 24 hours. If you didn't create an account with Tone2Vibe, you can safely ignore this email.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 24px; text-align: center; background-color: #fafafa; border-top: 1px solid #eeeeee;">
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
          You're receiving this email because you signed up for <br>
         Tone2Vibe.in
        </p>

      </td>
    </tr>
  </table>
</body>
</html>
      `;
      try {
        await fetch('https://api.brevo.com/v3/smtp/email', {
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
            to: [
              {
                email: normalizedEmail,
                name: displayName
              }
            ],
            subject: 'Confirm Your Email - Tone2Vibe',
            htmlContent: emailHtml
          })
        });
      } catch (emailError) {
      // Email error - silent fail
      }
    }
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
  } catch (err) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error'
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
