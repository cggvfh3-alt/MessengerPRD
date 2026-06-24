/*
 * Edge Function: send-push-notification
 * Sends Expo push notifications to all chat members (except sender)
 * when a new message is posted.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  // ── CORS preflight ──────────────────────────────────────────────────────────
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ── Auth check ─────────────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── Parse body ─────────────────────────────────────────────────────────────
    const { chatId, senderId, content, messageType } = await req.json();

    if (!chatId || !senderId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: chatId, senderId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── Admin client (bypasses RLS for notification data) ──────────────────────
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // ── Get sender info ────────────────────────────────────────────────────────
    const { data: sender } = await supabaseAdmin
      .from('user_profiles')
      .select('username, email')
      .eq('id', senderId)
      .single();

    const senderName = sender?.username || sender?.email?.split('@')[0] || 'ИТП';

    // ── Get all chat members except sender ─────────────────────────────────────
    const { data: members } = await supabaseAdmin
      .from('chat_members')
      .select('user_id')
      .eq('chat_id', chatId)
      .neq('user_id', senderId);

    if (!members || members.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, reason: 'No other members' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── Fetch push tokens ──────────────────────────────────────────────────────
    const memberIds = members.map((m: { user_id: string }) => m.user_id);
    const { data: profiles } = await supabaseAdmin
      .from('user_profiles')
      .select('push_token')
      .in('id', memberIds)
      .not('push_token', 'is', null);

    const tokens = (profiles ?? [])
      .map((p: { push_token: string | null }) => p.push_token)
      .filter((t): t is string => !!t && t.startsWith('ExponentPushToken'));

    if (tokens.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, reason: 'No push tokens registered' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── Build notification body ────────────────────────────────────────────────
    let body: string;
    if (messageType === 'image') body = '📷 Фото';
    else if (messageType === 'voice') body = '🎤 Голосовое сообщение';
    else body = (content ?? 'Новое сообщение').substring(0, 100);

    // ── Send to Expo Push API ─────────────────────────────────────────────────
    const notifications = tokens.map((token: string) => ({
      to: token,
      title: senderName,
      body,
      sound: 'default',
      badge: 1,
      channelId: 'messages',
      data: { chatId },
      priority: 'high',
    }));

    console.log(`[push] Sending ${notifications.length} notifications — chat: ${chatId}`);

    const expoResp = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(notifications),
    });

    const expoResult = await expoResp.json();
    console.log('[push] Expo response:', JSON.stringify(expoResult));

    return new Response(
      JSON.stringify({ sent: tokens.length, expo: expoResult }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[push] Error:', String(err));
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
