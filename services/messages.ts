// Messages service — data layer only
import { getSupabaseClient } from '@/template';

export interface MessageReaction {
  emoji: string;
  count: number;
  hasReacted: boolean;
}

export interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string | null;
  type: 'text' | 'image' | 'file' | 'voice';
  media_url: string | null;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  deleted_for_all: boolean;
  edited_at: string | null;
  reply_to_id: string | null;
  forwarded_from_id: string | null;
  sender?: { username: string | null; email: string; avatar_url: string | null };
  reply_to?: { content: string | null; type: string; sender?: { username: string | null } } | null;
  reactions?: MessageReaction[];
  is_read?: boolean;
}

export async function fetchMessages(chatId: string): Promise<{ data: Message[]; error: string | null }> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('chat_id', chatId)
    .eq('deleted_for_all', false)
    .order('created_at', { ascending: true })
    .limit(100);

  if (error) return { data: [], error: error.message };

  const senderCache: Record<string, { username: string | null; email: string; avatar_url: string | null }> = {};
  const enriched: Message[] = [];

  const { data: { user } } = await supabase.auth.getUser();
  const currentUserId = user?.id;

  // Get receipts for read status
  const msgIds = (data || []).map((m: Message) => m.id);
  let readReceiptMap: Record<string, boolean> = {};
  if (msgIds.length > 0) {
    const { data: receipts } = await supabase
      .from('message_receipts')
      .select('message_id')
      .in('message_id', msgIds)
      .neq('user_id', currentUserId || '');
    for (const r of receipts || []) {
      readReceiptMap[r.message_id] = true;
    }
  }

  for (const msg of data || []) {
    if (!senderCache[msg.sender_id]) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('username, email, avatar_url')
        .eq('id', msg.sender_id)
        .single();
      senderCache[msg.sender_id] = profile || { username: null, email: '', avatar_url: null };
    }

    // Fetch reply_to
    let replyTo = null;
    if (msg.reply_to_id) {
      const { data: replyMsg } = await supabase
        .from('messages')
        .select('content, type, sender_id')
        .eq('id', msg.reply_to_id)
        .single();
      if (replyMsg) {
        if (!senderCache[replyMsg.sender_id]) {
          const { data: p } = await supabase
            .from('user_profiles')
            .select('username, email, avatar_url')
            .eq('id', replyMsg.sender_id)
            .single();
          senderCache[replyMsg.sender_id] = p || { username: null, email: '', avatar_url: null };
        }
        replyTo = { ...replyMsg, sender: senderCache[replyMsg.sender_id] };
      }
    }

    // Fetch reactions
    const { data: reactions } = await supabase
      .from('message_reactions')
      .select('emoji, user_id')
      .eq('message_id', msg.id);

    const reactionMap: Record<string, { count: number; hasReacted: boolean }> = {};
    for (const r of reactions || []) {
      if (!reactionMap[r.emoji]) reactionMap[r.emoji] = { count: 0, hasReacted: false };
      reactionMap[r.emoji].count++;
      if (r.user_id === currentUserId) reactionMap[r.emoji].hasReacted = true;
    }
    const reactionList: MessageReaction[] = Object.entries(reactionMap).map(([emoji, v]) => ({
      emoji,
      count: v.count,
      hasReacted: v.hasReacted,
    }));

    enriched.push({
      ...msg,
      sender: senderCache[msg.sender_id],
      reply_to: replyTo,
      reactions: reactionList,
      is_read: readReceiptMap[msg.id] || false,
    });
  }

  return { data: enriched, error: null };
}

export async function sendTextMessage(
  chatId: string,
  senderId: string,
  content: string,
  replyToId?: string
): Promise<{ data: Message | null; error: string | null }> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('messages')
    .insert({
      chat_id: chatId,
      sender_id: senderId,
      content,
      type: 'text',
      reply_to_id: replyToId || null,
    })
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  await supabase.from('chats').update({ updated_at: new Date().toISOString() }).eq('id', chatId);
  return { data, error: null };
}

export async function sendImageMessage(
  chatId: string,
  senderId: string,
  mediaUrl: string,
  replyToId?: string
): Promise<{ data: Message | null; error: string | null }> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('messages')
    .insert({
      chat_id: chatId,
      sender_id: senderId,
      type: 'image',
      media_url: mediaUrl,
      reply_to_id: replyToId || null,
    })
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  await supabase.from('chats').update({ updated_at: new Date().toISOString() }).eq('id', chatId);
  return { data, error: null };
}

export async function sendVoiceMessage(
  chatId: string,
  senderId: string,
  mediaUrl: string,
  replyToId?: string
): Promise<{ data: Message | null; error: string | null }> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('messages')
    .insert({
      chat_id: chatId,
      sender_id: senderId,
      type: 'voice',
      media_url: mediaUrl,
      reply_to_id: replyToId || null,
    })
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  await supabase.from('chats').update({ updated_at: new Date().toISOString() }).eq('id', chatId);
  return { data, error: null };
}

export async function editMessage(
  messageId: string,
  content: string
): Promise<{ error: string | null }> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('messages')
    .update({ content, edited_at: new Date().toISOString() })
    .eq('id', messageId);
  return { error: error?.message || null };
}

export async function deleteMessage(
  messageId: string,
  forAll: boolean = false
): Promise<{ error: string | null }> {
  const supabase = getSupabaseClient();
  if (forAll) {
    const { error } = await supabase
      .from('messages')
      .update({ deleted_for_all: true, is_deleted: true })
      .eq('id', messageId);
    return { error: error?.message || null };
  } else {
    const { error } = await supabase
      .from('messages')
      .update({ is_deleted: true })
      .eq('id', messageId);
    return { error: error?.message || null };
  }
}

export async function toggleReaction(
  messageId: string,
  userId: string,
  emoji: string,
  hasReacted: boolean
): Promise<{ error: string | null }> {
  const supabase = getSupabaseClient();
  if (hasReacted) {
    const { error } = await supabase
      .from('message_reactions')
      .delete()
      .eq('message_id', messageId)
      .eq('user_id', userId)
      .eq('emoji', emoji);
    return { error: error?.message || null };
  } else {
    const { error } = await supabase
      .from('message_reactions')
      .insert({ message_id: messageId, user_id: userId, emoji });
    return { error: error?.message || null };
  }
}

export async function markMessageAsRead(
  messageId: string,
  userId: string
): Promise<void> {
  const supabase = getSupabaseClient();
  await supabase
    .from('message_receipts')
    .upsert(
      { message_id: messageId, user_id: userId },
      { onConflict: 'message_id,user_id' }
    );
}

export async function forwardMessage(
  originalMessageId: string,
  targetChatId: string,
  senderId: string
): Promise<{ data: Message | null; error: string | null }> {
  const supabase = getSupabaseClient();
  const { data: original } = await supabase
    .from('messages')
    .select('*')
    .eq('id', originalMessageId)
    .single();

  if (!original) return { data: null, error: 'Сообщение не найдено' };

  const { data, error } = await supabase
    .from('messages')
    .insert({
      chat_id: targetChatId,
      sender_id: senderId,
      content: original.content,
      type: original.type,
      media_url: original.media_url,
      forwarded_from_id: originalMessageId,
    })
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  await supabase.from('chats').update({ updated_at: new Date().toISOString() }).eq('id', targetChatId);
  return { data, error: null };
}

export async function setTyping(chatId: string, userId: string, isTyping: boolean): Promise<void> {
  const supabase = getSupabaseClient();
  if (isTyping) {
    await supabase
      .from('typing_indicators')
      .upsert({ chat_id: chatId, user_id: userId, updated_at: new Date().toISOString() }, {
        onConflict: 'chat_id,user_id',
      });
  } else {
    await supabase
      .from('typing_indicators')
      .delete()
      .eq('chat_id', chatId)
      .eq('user_id', userId);
  }
}

export async function getTypingUsers(chatId: string, currentUserId: string): Promise<string[]> {
  const supabase = getSupabaseClient();
  const cutoff = new Date(Date.now() - 5000).toISOString();
  const { data } = await supabase
    .from('typing_indicators')
    .select('user_id')
    .eq('chat_id', chatId)
    .neq('user_id', currentUserId)
    .gt('updated_at', cutoff);

  if (!data || data.length === 0) return [];

  const ids = data.map((r: { user_id: string }) => r.user_id);
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('username, email')
    .in('id', ids);

  return (profiles || []).map((p: { username: string | null; email: string }) => p.username || p.email);
}
