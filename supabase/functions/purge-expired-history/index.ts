import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const nowIso = new Date().toISOString();

    // Fetch expired items in small batches
    const { data: expired, error } = await supabase
      .from('history')
      .select('id, user_id, audio_url')
      .lt('retention_expires_at', nowIso)
      .limit(500);

    if (error) throw error;

    let filesDeleted = 0;
    for (const item of expired || []) {
      if (item.audio_url) {
        try {
          const urlParts = item.audio_url.split('/');
          const bucketIndex = urlParts.indexOf('user-generates');
          if (bucketIndex !== -1 && bucketIndex < urlParts.length - 1) {
            const filePath = urlParts.slice(bucketIndex + 1).join('/');
            const { error: delErr } = await supabase.storage.from('user-generates').remove([filePath]);
            if (!delErr) filesDeleted++;
          }
        } catch (_) {}
      }
    }

    const { error: delHistoryErr } = await supabase
      .from('history')
      .delete()
      .lt('retention_expires_at', nowIso);

    if (delHistoryErr) throw delHistoryErr;

    // Also cleanup analytics older than 90 days (global bound)
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    await supabase
      .from('analytics')
      .delete()
      .lt('created_at', ninetyDaysAgo);

    return new Response(
      JSON.stringify({ success: true, expired: expired?.length || 0, filesDeleted }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ success: false, error: (e as Error).message || 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
