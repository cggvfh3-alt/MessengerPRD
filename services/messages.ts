// Messages service — data layer only
import { getSupabaseClient } from '@/template';

export interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string | null;
  type: 'text' | 'image' | 'file' | 'voice';
  media_url: string | null;
  created_at: string;
  is_deleted: boolean;
  sender?: { username: string | null; email: string };
}

export async function fetchMessages(chatId: string): Promise<{ data: Message[]; error: string | null }> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('chat_id', chatId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: true })
    .limit(100);

  if (error) return { data: [], error: error.message };

  // Enrich with sender info
  const enriched: Message[] = [];
  const senderCache: Record<string, { username: string | null; email: string }> = {};

  for (const msg of data || []) {
    if (!senderCache[msg.sender_id]) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('username, email')
        .eq('id', msg.sender_id)
        .single();
      senderCache[msg.sender_id] = profile || { username: null, email: '' };
    }
    enriched.push({ ...msg, sender: senderCache[msg.sender_id] });
  }

  return { data: enriched, error: null };
}

export async function sendTextMessage(
  chatId: string,
  senderId: string,
  content: string
): Promise<{ data: Message | null; error: string | null }> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('messages')
    .insert({ chat_id: chatId, sender_id: senderId, content, type: 'text' })
    .select()
    .single();

  if (error) return { data: null, error: error.message };

  // Update chat updated_at
  await supabase.from('chats').update({ updated_at: new Date().toISOString() }).eq('id', chatId);

  return { data, error: null };
}

export async function sendImageMessage(
  chatId: string,
  senderId: string,
  mediaUrl: string
): Promise<{ data: Message | null; error: string | null }> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('messages')
    .insert({ chat_id: chatId, sender_id: senderId, type: 'image', media_url: mediaUrl })
    .select()
    .single();

  if (error) return { data: null, error: error.message };

  await supabase.from('chats').update({ updated_at: new Date().toISOString() }).eq('id', chatId);

  return { data, error: null };
}

export async function deleteMessage(messageId: string): Promise<{ error: string | null }> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('messages')
    .update({ is_deleted: true })
    .eq('id', messageId);
  return { error: error?.message || null };
}
