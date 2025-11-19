import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(req);
  }

  try {
    // Create Supabase client with service role key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify the JWT token to get user ID
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = user.id

    // Delete user data from all tables (cascading deletes should handle most relationships)
    console.log(`Starting account deletion for user: ${userId}`)

    // Get user email before deletion
    const userEmail = user.email

    // Add email to banned list to prevent re-signup
    if (userEmail) {
      const { error: banError } = await supabase
        .from('banned_emails')
        .insert({
          email: userEmail,
          reason: 'account_deleted'
        })

      if (banError) {
        console.error('Error adding email to banned list:', banError)
      }
    }

    // Delete from profiles table (this should cascade to other related tables)
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('user_id', userId)

    if (profileError) {
      console.error('Error deleting profile:', profileError)
    }

    // Delete from history table
    const { error: historyError } = await supabase
      .from('history')
      .delete()
      .eq('user_id', userId)

    if (historyError) {
      console.error('Error deleting history:', historyError)
    }

    // Delete from voice_recordings table
    const { error: voiceError } = await supabase
      .from('voice_recordings')
      .delete()
      .eq('user_id', userId)

    if (voiceError) {
      console.error('Error deleting voice recordings:', voiceError)
    }

    // Delete from user_voices table
    const { error: userVoicesError } = await supabase
      .from('user_voices')
      .delete()
      .eq('user_id', userId)

    if (userVoicesError) {
      console.error('Error deleting user voices:', userVoicesError)
    }

    // Delete from orders table
    const { error: ordersError } = await supabase
      .from('orders')
      .delete()
      .eq('user_id', userId)

    if (ordersError) {
      console.error('Error deleting orders:', ordersError)
    }

    // Delete from payments table
    const { error: paymentsError } = await supabase
      .from('payments')
      .delete()
      .eq('user_id', userId)

    if (paymentsError) {
      console.error('Error deleting payments:', paymentsError)
    }

    // Delete from word_purchases table
    const { error: wordPurchasesError } = await supabase
      .from('word_purchases')
      .delete()
      .eq('user_id', userId)

    if (wordPurchasesError) {
      console.error('Error deleting word purchases:', wordPurchasesError)
    }

    // Delete from user_sessions table
    const { error: sessionsError } = await supabase
      .from('user_sessions')
      .delete()
      .eq('user_id', userId)

    if (sessionsError) {
      console.error('Error deleting user sessions:', sessionsError)
    }

    // Delete from purchase_notifications table
    const { error: notificationsError } = await supabase
      .from('purchase_notifications')
      .delete()
      .eq('user_id', userId)

    if (notificationsError) {
      console.error('Error deleting purchase notifications:', notificationsError)
    }

    // Delete from ip_tracking table
    const { error: ipError } = await supabase
      .from('ip_tracking')
      .delete()
      .eq('user_id', userId)

    if (ipError) {
      console.error('Error deleting IP tracking:', ipError)
    }

    // Finally, delete the user from auth.users using the admin client
    const { error: deleteUserError } = await supabase.auth.admin.deleteUser(userId)
    
    if (deleteUserError) {
      console.error('Error deleting user from auth:', deleteUserError)
      return new Response(
        JSON.stringify({ error: 'Failed to delete user account', details: deleteUserError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Successfully deleted account for user: ${userId}`)

    return new Response(
      JSON.stringify({ message: 'Account deleted successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in delete-account function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})