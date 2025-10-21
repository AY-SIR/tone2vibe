import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

interface PasswordResetRequest {
  email: string;
}

// Fixed CORS headers function
function getCorsHeaders(origin: string | null) {
  const allowedOrigins = ['https://tone2vibe.in', 'http://localhost:8000'];
  const validOrigin = allowedOrigins.includes(origin || '') ? origin : '';
  return {
    'Access-Control-Allow-Origin': validOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Max-Age': '86400',
  };
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const brevoApiKey = Deno.env.get('BREVO_API_KEY');

    if (!supabaseUrl || !supabaseKey || !brevoApiKey) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { email } = await req.json() as PasswordResetRequest;
    if (!email) throw new Error('Email is required');

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user exists
    const { data: usersData, error: listError } = await supabaseClient.auth.admin.listUsers();
    if (listError) throw listError;

    const user = usersData?.users?.find(u => u.email?.toLowerCase() === normalizedEmail);

    // Always respond with success message to prevent email enumeration
    if (!user) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'If an account exists with this email, a password reset link has been sent.'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate reset token
    const resetToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour expiry

    // Store token in DB
    const { error: insertError } = await supabaseClient
      .from('password_reset_tokens')
      .insert({ user_id: user.id, email: normalizedEmail, token: resetToken, expires_at: expiresAt });
    if (insertError) throw insertError;

    const originHeader = req.headers.get('origin') || 'https://tone2vibe.in';
    const resetUrl = `${originHeader}/reset-password?token=${resetToken}`;

    // Fetch user full name from profiles
    const { data: profileData } = await supabaseClient
      .from('profiles')
      .select('full_name')
      .eq('user_id', user.id)
      .single();
    const fullName = profileData?.full_name || normalizedEmail.split('@')[0];

    // Send email
    try {
      await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'api-key': brevoApiKey,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          sender: { name: 'Tone2Vibe', email: 'yadavakhilesh2519@gmail.com' },
          to: [{ email: normalizedEmail, name: fullName }],
          subject: 'Reset Your Password - Tone2Vibe',
          htmlContent: `<p>Hello ${fullName},</p><p>Click the link to reset your password: <a href="${resetUrl}">Reset Password</a></p><p>This link expires in 1 hour.</p>`
        })
      });
    } catch (emailError) {
      // Email error - silent fail
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
