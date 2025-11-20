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
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    let targetUserId: string | null = body?.user_id || null;

    // Try to derive from auth header if not provided
    if (!targetUserId) {
      try {
        const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!);
        const authHeader = req.headers.get('Authorization') || '';
        const token = authHeader.replace('Bearer ', '');
        const { data: userData } = await anonClient.auth.getUser(token);
        targetUserId = userData?.user?.id || null;
      } catch (_) {}
    }

    if (!targetUserId) {
      return new Response(JSON.stringify({ success: false, error: 'user_id required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Delete all analytics for this user
    const { error } = await supabase
      .from('analytics')
      .delete()
      .eq('user_id', targetUserId);

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, user_id: targetUserId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (e: unknown) {
    return new Response(JSON.stringify({ success: false, error: (e as Error)?.message || 'Unknown error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
