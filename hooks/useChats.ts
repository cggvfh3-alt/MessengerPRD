// Chat list state management hook
import { useState, useCallback, useEffect, useRef } from 'react';
import {
  fetchMyChats,
  createOrGetDirectChat,
  searchUsers,
  getTotalUnreadCount,
  Chat,
  UserProfile,
} from '@/services/chats';

export function useChats(userId: string) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalUnread, setTotalUnread] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadChats = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data, error: err } = await fetchMyChats(userId);
    setChats(data);
    setError(err);
    setLoading(false);
    // Total unread from loaded chats
    const unread = data.reduce((sum, c) => sum + (c.unread_count || 0), 0);
    setTotalUnread(unread);
  }, [userId]);

  const refreshUnread = useCallback(async () => {
    if (!userId) return;
    const count = await getTotalUnreadCount(userId);
    setTotalUnread(count);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    loadChats();
    // Poll for new messages every 5s for unread badge
    intervalRef.current = setInterval(refreshUnread, 5000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [userId]);

  const startDirectChat = useCallback(async (otherUserId: string): Promise<Chat | null> => {
    const { data, error: err } = await createOrGetDirectChat(userId, otherUserId);
    if (err) setError(err);
    if (data) {
      await loadChats();
      return data;
    }
    return null;
  }, [userId, loadChats]);

  return { chats, loading, error, totalUnread, loadChats, startDirectChat };
}

export function useUserSearch(currentUserId: string) {
  const [results, setResults] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (query: string) => {
    if (!query.trim()) { setResults([]); return; }
    setLoading(true);
    const { data } = await searchUsers(query.trim(), currentUserId);
    setResults(data);
    setLoading(false);
  }, [currentUserId]);

  const clear = useCallback(() => setResults([]), []);

  return { results, loading, search, clear };
}
