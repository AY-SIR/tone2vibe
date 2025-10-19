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
          <h2>Hello ${fullName},</h2>
          <p>We received a request to reset your password. Click below to reset it:</p>
          <a href="${resetUrl}" target="_blank" style="background:#000;color:#fff;padding:10px 20px;text-decoration:none;border-radius:4px;">Reset Password</a>
          <p>This link expires in 1 hour. If you didn't request this, ignore this email.</p>
        `,
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
