// Messages state and polling hook
import { useState, useCallback, useEffect, useRef } from 'react';
import {
  fetchMessages,
  sendTextMessage,
  sendImageMessage,
  sendVoiceMessage,
  editMessage,
  deleteMessage,
  toggleReaction,
  forwardMessage,
  setTyping,
  getTypingUsers,
  markMessageAsRead,
  Message,
} from '@/services/messages';
import { pickAndUploadImage, takePhotoAndUpload, uploadVoice } from '@/services/storage';
import { markChatAsRead } from '@/services/chats';
import { useAlert } from '@/template';

export function useMessages(chatId: string, userId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [recordingVoice, setRecordingVoice] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { showAlert } = useAlert();

  const loadMessages = useCallback(async () => {
    if (!chatId) return;
    const { data, error: err } = await fetchMessages(chatId);
    if (!err) {
      setMessages(data);
      // Mark all messages as read
      for (const msg of data) {
        if (msg.sender_id !== userId) {
          markMessageAsRead(msg.id, userId);
        }
      }
    }
    if (err) setError(err);
  }, [chatId, userId]);

  useEffect(() => {
    if (!chatId || !userId) return;
    setLoading(true);
    loadMessages().finally(() => setLoading(false));
    markChatAsRead(chatId, userId);

    intervalRef.current = setInterval(async () => {
      await loadMessages();
      markChatAsRead(chatId, userId);
      const typingList = await getTypingUsers(chatId, userId);
      setTypingUsers(typingList);
    }, 3000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      setTyping(chatId, userId, false);
    };
  }, [chatId, userId, loadMessages]);

  const handleTyping = useCallback(() => {
    setTyping(chatId, userId, true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setTyping(chatId, userId, false);
    }, 3000);
  }, [chatId, userId]);

  const sendText = useCallback(async (content: string, replyToId?: string): Promise<boolean> => {
    if (!content.trim()) return false;
    setSending(true);
    setTyping(chatId, userId, false);
    const { data, error: err } = await sendTextMessage(chatId, userId, content.trim(), replyToId);
    if (err) {
      showAlert('Ошибка отправки', err);
      setSending(false);
      return false;
    }
    if (data) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === data.id)) return prev;
        return [...prev, { ...data, sender: { username: null, email: '', avatar_url: null }, reactions: [], reply_to: null }];
      });
    }
    setSending(false);
    return true;
  }, [chatId, userId, showAlert]);

  const sendPhoto = useCallback(async (source: 'gallery' | 'camera', replyToId?: string): Promise<boolean> => {
    setUploadingPhoto(true);
    const { url, error: uploadErr } =
      source === 'camera'
        ? await takePhotoAndUpload(userId)
        : await pickAndUploadImage(userId);

    if (uploadErr) {
      showAlert('Ошибка загрузки фото', uploadErr);
      setUploadingPhoto(false);
      return false;
    }
    if (!url) { setUploadingPhoto(false); return false; }

    const { data, error: msgErr } = await sendImageMessage(chatId, userId, url, replyToId);
    if (msgErr) {
      showAlert('Ошибка отправки', msgErr);
      setUploadingPhoto(false);
      return false;
    }
    if (data) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === data.id)) return prev;
        return [...prev, { ...data, sender: { username: null, email: '', avatar_url: null }, reactions: [], reply_to: null }];
      });
    }
    setUploadingPhoto(false);
    return true;
  }, [chatId, userId, showAlert]);

  const sendVoice = useCallback(async (localUri: string, replyToId?: string): Promise<boolean> => {
    const { url, error: uploadErr } = await uploadVoice(userId, localUri);
    if (uploadErr) {
      showAlert('Ошибка загрузки голосового', uploadErr);
      return false;
    }
    if (!url) return false;

    const { data, error: msgErr } = await sendVoiceMessage(chatId, userId, url, replyToId);
    if (msgErr) {
      showAlert('Ошибка отправки', msgErr);
      return false;
    }
    if (data) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === data.id)) return prev;
        return [...prev, { ...data, sender: { username: null, email: '', avatar_url: null }, reactions: [], reply_to: null }];
      });
    }
    return true;
  }, [chatId, userId, showAlert]);

  const editMsg = useCallback(async (messageId: string, content: string): Promise<boolean> => {
    const { error: err } = await editMessage(messageId, content);
    if (err) { showAlert('Ошибка', err); return false; }
    setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, content, edited_at: new Date().toISOString() } : m));
    return true;
  }, [showAlert]);

  const removeMessage = useCallback(async (messageId: string, forAll: boolean = false) => {
    const { error: err } = await deleteMessage(messageId, forAll);
    if (err) { showAlert('Ошибка удаления', err); return; }
    if (forAll) {
      setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, deleted_for_all: true, content: null } : m));
    } else {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    }
  }, [showAlert]);

  const addReaction = useCallback(async (messageId: string, emoji: string) => {
    const msg = messages.find((m) => m.id === messageId);
    if (!msg) return;
    const existing = msg.reactions?.find((r) => r.emoji === emoji);
    const hasReacted = existing?.hasReacted || false;

    await toggleReaction(messageId, userId, emoji, hasReacted);

    setMessages((prev) => prev.map((m) => {
      if (m.id !== messageId) return m;
      const reactions = [...(m.reactions || [])];
      const idx = reactions.findIndex((r) => r.emoji === emoji);
      if (idx === -1 && !hasReacted) {
        reactions.push({ emoji, count: 1, hasReacted: true });
      } else if (idx !== -1) {
        const updated = { ...reactions[idx] };
        updated.hasReacted = !hasReacted;
        updated.count = hasReacted ? Math.max(0, updated.count - 1) : updated.count + 1;
        if (updated.count === 0) reactions.splice(idx, 1);
        else reactions[idx] = updated;
      }
      return { ...m, reactions };
    }));
  }, [messages, userId]);

  const forward = useCallback(async (messageId: string, targetChatId: string): Promise<boolean> => {
    const { error: err } = await forwardMessage(messageId, targetChatId, userId);
    if (err) { showAlert('Ошибка пересылки', err); return false; }
    return true;
  }, [userId, showAlert]);

  return {
    messages,
    loading,
    sending,
    uploadingPhoto,
    recordingVoice,
    setRecordingVoice,
    typingUsers,
    error,
    sendText,
    sendPhoto,
    sendVoice,
    editMsg,
    removeMessage,
    addReaction,
    forward,
    reload: loadMessages,
    handleTyping,
  };
}
