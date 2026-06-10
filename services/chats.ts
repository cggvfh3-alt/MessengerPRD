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
  // joined fields
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
    // Get all chat_ids for current user
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

    // For each direct chat, fetch the other user
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
          (chat as Chat).other_user = profile || undefined;
          if (!chat.name && profile) {
            chat.name = profile.username || profile.email;
          }
        }
      }

      // Fetch last message
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

      enriched.push(chat);
    }

    return { data: enriched, error: null };
  } catch (e: any) {
    return { data: [], error: e.message };
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
    // Check if direct chat already exists between these two users
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
        // Check if it's a direct chat
        const { data: existing } = await supabase
          .from('chats')
          .select('*')
          .eq('id', shared[0].chat_id)
          .eq('type', 'direct')
          .single();

        if (existing) return { data: existing, error: null };
      }
    }

    // Create new direct chat
    const { data: newChat, error: chatErr } = await supabase
      .from('chats')
      .insert({ type: 'direct', created_by: currentUserId })
      .select()
      .single();

    if (chatErr) return { data: null, error: chatErr.message };

    // Add both users as members
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
