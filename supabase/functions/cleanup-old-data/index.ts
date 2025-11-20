import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
Deno.serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || "";
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || "";
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log('Starting cleanup process...');
    // Get all user profiles with their plans
    const { data: profiles, error: profileError } = await supabase.from('profiles').select('user_id, plan');
    if (profileError) {
      console.error('Error fetching profiles:', profileError);
      throw profileError;
    }
    let totalDeleted = 0;
    let totalFilesDeleted = 0;
    // Process each user
    for (const profile of profiles || []){
      const { user_id, plan } = profile;
      // Use item-level retention: delete where retention_expires_at passed
      console.log(`Processing user ${user_id} with plan ${plan} using item-level retention`);
      const { data: oldHistory, error: historyFetchError } = await supabase.from('history').select('id, audio_url').eq('user_id', user_id).lt('retention_expires_at', new Date().toISOString());
      if (historyFetchError) {
        console.error(`Error fetching history for user ${user_id}:`, historyFetchError);
        continue;
      }
      if (oldHistory && oldHistory.length > 0) {
        console.log(`Found ${oldHistory.length} old history records for user ${user_id}`);
        // Delete associated files from storage bucket
        for (const record of oldHistory){
          if (record.audio_url) {
            try {
              // Extract file path from URL
              const urlParts = record.audio_url.split('/');
              const bucketIndex = urlParts.indexOf('user-generates');
              if (bucketIndex !== -1 && bucketIndex < urlParts.length - 1) {
                const filePath = urlParts.slice(bucketIndex + 1).join('/');
                const { error: deleteError } = await supabase.storage.from('user-generates').remove([
                  filePath
                ]);
                if (deleteError) {
                  console.error(`Error deleting file ${filePath}:`, deleteError);
                } else {
                  totalFilesDeleted++;
                  console.log(`Deleted file: ${filePath}`);
                }
              }
            } catch (fileError) {
              console.error('Error processing file deletion:', fileError);
            }
          }
        }
        // Delete history records
        const { error: deleteHistoryError } = await supabase.from('history').delete().eq('user_id', user_id).lt('retention_expires_at', new Date().toISOString());
        if (deleteHistoryError) {
          console.error(`Error deleting history for user ${user_id}:`, deleteHistoryError);
        } else {
          totalDeleted += oldHistory.length;
          console.log(`Deleted ${oldHistory.length} history records for user ${user_id}`);
        }
      }
      // Delete analytics records older than 90 days globally or linked to deleted history
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
      const { error: analyticsDeleteError } = await supabase.from('analytics').delete().eq('user_id', user_id).lt('created_at', ninetyDaysAgo);
      if (analyticsDeleteError) {
        console.error(`Error deleting analytics for user ${user_id}:`, analyticsDeleteError);
      } else {
        console.log(`Deleted old analytics for user ${user_id}`);
      }
    }
    console.log(`Cleanup complete. Total records deleted: ${totalDeleted}, Files deleted: ${totalFilesDeleted}`);
    return new Response(JSON.stringify({
      success: true,
      message: 'Cleanup completed successfully',
      recordsDeleted: totalDeleted,
      filesDeleted: totalFilesDeleted
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
});
