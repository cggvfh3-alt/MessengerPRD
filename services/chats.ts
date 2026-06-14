// Chat service — data layer only, no React
import { getSupabaseClient } from '@/template';

export interface Chat {
  id: string;
  type: 'direct' | 'group' | 'channel';
  name: string | null;
  avatar_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  other_user?: { id: string; username: string | null; email: string };
  last_message?: string;
  last_message_time?: string;
  unread_count?: number;
}

export interface UserProfile {
  id: string;
  username: string | null;
  email: string;
}

export async function fetchMyChats(userId: string): Promise<{ data: Chat[]; error: string | null }> {
  const supabase = getSupabaseClient();
  try {
    const { data: memberRows, error: memberErr } = await supabase
      .from('chat_members')
      .select('chat_id')
      .eq('user_id', userId);

    if (memberErr) return { data: [], error: memberErr.message };
    if (!memberRows || memberRows.length === 0) return { data: [], error: null };

    const chatIds = memberRows.map((r: { chat_id: string }) => r.chat_id);

    const { data: chats, error: chatErr } = await supabase
      .from('chats')
      .select('*')
      .in('id', chatIds)
      .order('updated_at', { ascending: false });

    if (chatErr) return { data: [], error: chatErr.message };

    // Fetch read statuses for all chats at once
    const { data: readStatuses } = await supabase
      .from('chat_read_status')
      .select('chat_id, last_read_at')
      .eq('user_id', userId)
      .in('chat_id', chatIds);

    const readMap: Record<string, string> = {};
    for (const rs of readStatuses || []) {
      readMap[rs.chat_id] = rs.last_read_at;
    }

    const enriched: Chat[] = [];
    for (const chat of chats || []) {
      if (chat.type === 'direct') {
        const { data: allMembers } = await supabase
          .from('chat_members')
          .select('user_id')
          .eq('chat_id', chat.id);

        const otherUserId = (allMembers || [])
          .map((m: { user_id: string }) => m.user_id)
          .find((id: string) => id !== userId);

        if (otherUserId) {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('id, username, email')
            .eq('id', otherUserId)
            .single();
          chat.other_user = profile || undefined;
          if (!chat.name && profile) {
            chat.name = profile.username || profile.email;
          }
        }
      }

      // Last message
      const { data: lastMsg } = await supabase
        .from('messages')
        .select('content, type, created_at')
        .eq('chat_id', chat.id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (lastMsg) {
        chat.last_message = lastMsg.type === 'image' ? '📷 Фото' : lastMsg.content;
        chat.last_message_time = lastMsg.created_at;
      }

      // Unread count
      const lastRead = readMap[chat.id];
      if (lastRead) {
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('chat_id', chat.id)
          .eq('is_deleted', false)
          .neq('sender_id', userId)
          .gt('created_at', lastRead);
        chat.unread_count = count || 0;
      } else {
        // Never read — count all messages not from self
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('chat_id', chat.id)
          .eq('is_deleted', false)
          .neq('sender_id', userId);
        chat.unread_count = count || 0;
      }

      enriched.push(chat);
    }

    return { data: enriched, error: null };
  } catch (e: any) {
    return { data: [], error: e.message };
  }
}

export async function markChatAsRead(chatId: string, userId: string): Promise<void> {
  const supabase = getSupabaseClient();
  await supabase
    .from('chat_read_status')
    .upsert(
      { chat_id: chatId, user_id: userId, last_read_at: new Date().toISOString() },
      { onConflict: 'chat_id,user_id' }
    );
}

export async function getTotalUnreadCount(userId: string): Promise<number> {
  const supabase = getSupabaseClient();
  try {
    const { data: memberRows } = await supabase
      .from('chat_members')
      .select('chat_id')
      .eq('user_id', userId);

    if (!memberRows || memberRows.length === 0) return 0;
    const chatIds = memberRows.map((r: { chat_id: string }) => r.chat_id);

    const { data: readStatuses } = await supabase
      .from('chat_read_status')
      .select('chat_id, last_read_at')
      .eq('user_id', userId)
      .in('chat_id', chatIds);

    const readMap: Record<string, string> = {};
    for (const rs of readStatuses || []) readMap[rs.chat_id] = rs.last_read_at;

    let total = 0;
    for (const chatId of chatIds) {
      const lastRead = readMap[chatId];
      const query = supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('chat_id', chatId)
        .eq('is_deleted', false)
        .neq('sender_id', userId);

      const { count } = lastRead ? await query.gt('created_at', lastRead) : await query;
      total += count || 0;
    }

    return total;
  } catch {
    return 0;
  }
}

export async function searchUsers(query: string, currentUserId: string): Promise<{ data: UserProfile[]; error: string | null }> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, username, email')
    .neq('id', currentUserId)
    .or(`username.ilike.%${query}%,email.ilike.%${query}%`)
    .limit(20);

  return { data: data || [], error: error?.message || null };
}

export async function createOrGetDirectChat(
  currentUserId: string,
  otherUserId: string
): Promise<{ data: Chat | null; error: string | null }> {
  const supabase = getSupabaseClient();
  try {
    const { data: myChats } = await supabase
      .from('chat_members')
      .select('chat_id')
      .eq('user_id', currentUserId);

    if (myChats && myChats.length > 0) {
      const myIds = myChats.map((r: { chat_id: string }) => r.chat_id);
      const { data: shared } = await supabase
        .from('chat_members')
        .select('chat_id')
        .eq('user_id', otherUserId)
        .in('chat_id', myIds);

      if (shared && shared.length > 0) {
        const { data: existing } = await supabase
          .from('chats')
          .select('*')
          .eq('id', shared[0].chat_id)
          .eq('type', 'direct')
          .single();

        if (existing) return { data: existing, error: null };
      }
    }

    const { data: newChat, error: chatErr } = await supabase
      .from('chats')
      .insert({ type: 'direct', created_by: currentUserId })
      .select()
      .single();

    if (chatErr) return { data: null, error: chatErr.message };

    const { error: memberErr } = await supabase
      .from('chat_members')
      .insert([
        { chat_id: newChat.id, user_id: currentUserId, role: 'admin' },
        { chat_id: newChat.id, user_id: otherUserId, role: 'member' },
      ]);

    if (memberErr) return { data: null, error: memberErr.message };

    return { data: newChat, error: null };
  } catch (e: any) {
    return { data: null, error: e.message };
  }
}

export async function updateUserProfile(
  userId: string,
  updates: { username?: string }
): Promise<{ error: string | null }> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('user_profiles')
    .update(updates)
    .eq('id', userId);
  return { error: error?.message || null };
}
