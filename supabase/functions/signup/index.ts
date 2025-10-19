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
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #000; color: #fff; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background-color: #000; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #999; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to Tone2Vibe!</h1>
            </div>
            <div class="content">
              <h2>Hi ${displayName},</h2>
              <p>Thank you for signing up! Please confirm your email address by clicking the button below:</p>
              <div style="text-align: center;">
                <a href="${confirmationUrl}" class="button">Confirm Email Address</a>
              </div>
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; background: #fff; padding: 10px; border-radius: 4px;">${confirmationUrl}</p>
              <p><strong>This link will expire in 24 hours.</strong></p>
              <p>If you didn't create an account, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>Tone2Vibe - Voice to Text Conversion</p>
            </div>
          </div>
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