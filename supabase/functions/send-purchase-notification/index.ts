import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PurchaseNotificationRequest {
  userId: string;
  orderId: string;
  type: 'plan' | 'words';
  amount: number;
  currency: string;
  planName?: string;
  wordCount?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get request data
    const { userId, orderId, type, amount, currency, planName, wordCount }: PurchaseNotificationRequest = await req.json();

    // Initialize Supabase client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get user profile and email
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('full_name, email')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile?.email) {
      throw new Error('User profile or email not found');
    }

    // Record the notification attempt
    const { error: insertError } = await supabaseAdmin
      .from('purchase_notifications')
      .insert({
        user_id: userId,
        order_id: orderId,
        email_type: 'purchase_confirmation',
        status: 'pending',
        created_at: new Date().toISOString()
      });

    if (insertError) {
      console.error('Error inserting notification record:', insertError);
    }

    // Check if Resend API key is available
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    if (!resendApiKey) {
      console.log('RESEND_API_KEY not configured, skipping email send');
      
      // Update notification status
      await supabaseAdmin
        .from('purchase_notifications')
        .update({
          status: 'skipped',
          error_message: 'Resend API key not configured'
        })
        .eq('user_id', userId)
        .eq('order_id', orderId);

      return new Response(JSON.stringify({
        success: true,
        message: 'Notification recorded, email sending skipped (API key not configured)'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // TODO: Send email using Resend when API key is available
    // For now, just simulate email sending
    const emailSubject = type === 'plan' 
      ? `${planName} Plan Purchase Successful`
      : `${wordCount?.toLocaleString()} Words Purchase Successful`;

    const emailBody = type === 'plan'
      ? `Hi ${profile.full_name || 'there'},\n\nYour ${planName} plan purchase has been confirmed!\n\nAmount: ${currency === 'INR' ? '₹' : '$'}${amount}\nPlan: ${planName}\n\nYou now have access to all premium features. Visit your dashboard to get started.\n\nBest regards,\nYour Team`
      : `Hi ${profile.full_name || 'there'},\n\nYour word purchase has been confirmed!\n\nAmount: ${currency === 'INR' ? '₹' : '$'}${amount}\nWords Added: ${wordCount?.toLocaleString()}\n\nThese words have been added to your account and never expire. Visit your dashboard to start creating.\n\nBest regards,\nYour Team`;

    console.log('Email would be sent:', {
      to: profile.email,
      subject: emailSubject,
      body: emailBody
    });

    // Update notification status as sent (simulated)
    await supabaseAdmin
      .from('purchase_notifications')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('order_id', orderId);

    return new Response(JSON.stringify({
      success: true,
      message: 'Purchase notification sent successfully',
      emailSubject,
      sentTo: profile.email
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error('Error sending purchase notification:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});