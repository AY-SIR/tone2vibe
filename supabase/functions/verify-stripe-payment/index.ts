import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header and verify user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Initialize Supabase with anon key for user verification
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Verify the user's JWT token
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Authentication failed:', authError);
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication failed' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { sessionId, plan } = await req.json();
    console.log('Verifying payment for session:', sessionId, 'User:', user.id);

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    console.log('Stripe session retrieved:', { id: session.id, payment_status: session.payment_status });

    // Initialize Supabase with service role key for admin operations
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false
        }
      }
    );

    // Find the order using the stripe session id and verify it belongs to the authenticated user
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('stripe_session_id', sessionId)
      .eq('user_id', user.id) // Security check - order must belong to authenticated user
      .single();

    if (orderError) {
      console.error('Error fetching order:', orderError);
      return new Response(
        JSON.stringify({ success: false, error: 'Order not found or unauthorized' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Order found:', order);

    // Check if order is already processed (idempotency)
    if (order.status === 'paid') {
      console.log('Order already processed, returning success');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Payment already processed',
          plan: plan 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (session.payment_status === 'paid' || session.status === 'complete') {
      // Verify session metadata or customer email matches order
      const sessionCustomer = session.customer_details?.email || session.customer_email;
      if (sessionCustomer && sessionCustomer !== user.email) {
        console.error('Session customer email mismatch:', sessionCustomer, 'vs', user.email);
        return new Response(
          JSON.stringify({ success: false, error: 'Payment verification failed' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update order status
      const { error: updateOrderError } = await supabase
        .from('orders')
        .update({ status: 'paid' })
        .eq('id', order.id);

      if (updateOrderError) {
        console.error('Error updating order:', updateOrderError);
        throw new Error('Failed to update order status');
      }

      // Calculate plan expiry (30 days from now)
      const planExpiresAt = new Date();
      planExpiresAt.setDate(planExpiresAt.getDate() + 30);

      // Set word limits and upload limits based on plan
      let wordLimits = 1000;
      let uploadLimits = 10;

      if (plan === 'pro') {
        wordLimits = 10000;
        uploadLimits = 50;
      } else if (plan === 'premium') {
        wordLimits = 25000;
        uploadLimits = 100;
      }

      // Update user's profile with the new plan
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          plan: plan,
          plan_expires_at: planExpiresAt.toISOString(),
          plan_start_date: new Date().toISOString(),
          plan_end_date: planExpiresAt.toISOString(),
          words_limit: wordLimits,
          upload_limit_mb: uploadLimits,
          plan_words_used: 0, // Reset plan words used for new plan
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id); // Only update authenticated user's profile

      if (profileError) {
        console.error('Error updating profile:', profileError);
        throw new Error('Failed to update user profile');
      }

      console.log('Payment verified and profile updated successfully');

      return new Response(
        JSON.stringify({
          success: true,
          plan: plan,
          expiresAt: planExpiresAt.toISOString(),
          wordLimits,
          uploadLimits
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } else {
      console.log('Payment not completed:', session.payment_status);
      return new Response(
        JSON.stringify({ success: false, error: 'Payment not completed' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

  } catch (error) {
    console.error('Error in verify-stripe-payment:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});