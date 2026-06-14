// Messages state and polling hook
import { useState, useCallback, useEffect, useRef } from 'react';
import {
  fetchMessages,
  sendTextMessage,
  sendImageMessage,
  deleteMessage,
  Message,
} from '@/services/messages';
import { pickAndUploadImage, takePhotoAndUpload } from '@/services/storage';
import { markChatAsRead } from '@/services/chats';
import { useAlert } from '@/template';

export function useMessages(chatId: string, userId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { showAlert } = useAlert();

  const loadMessages = useCallback(async () => {
    if (!chatId) return;
    const { data, error: err } = await fetchMessages(chatId);
    if (!err) setMessages(data);
    if (err) setError(err);
  }, [chatId]);

  useEffect(() => {
    if (!chatId || !userId) return;
    setLoading(true);
    loadMessages().finally(() => setLoading(false));

    // Mark as read when opening
    markChatAsRead(chatId, userId);

    // Poll every 3 seconds
    intervalRef.current = setInterval(async () => {
      await loadMessages();
      markChatAsRead(chatId, userId);
    }, 3000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [chatId, userId, loadMessages]);

  const sendText = useCallback(async (content: string): Promise<boolean> => {
    if (!content.trim()) return false;
    setSending(true);
    const { data, error: err } = await sendTextMessage(chatId, userId, content.trim());
    if (err) {
      showAlert('Ошибка отправки', err);
      setSending(false);
      return false;
    }
    if (data) {
      setMessages((prev) => {
        const exists = prev.some((m) => m.id === data.id);
        if (exists) return prev;
        return [...prev, { ...data, sender: { username: null, email: '' } }];
      });
    }
    setSending(false);
    return true;
  }, [chatId, userId, showAlert]);

  const sendPhoto = useCallback(async (source: 'gallery' | 'camera'): Promise<boolean> => {
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

    const { data, error: msgErr } = await sendImageMessage(chatId, userId, url);
    if (msgErr) {
      showAlert('Ошибка отправки', msgErr);
      setUploadingPhoto(false);
      return false;
    }
    if (data) {
      setMessages((prev) => {
        const exists = prev.some((m) => m.id === data.id);
        if (exists) return prev;
        return [...prev, { ...data, sender: { username: null, email: '' } }];
      });
    }
    setUploadingPhoto(false);
    return true;
  }, [chatId, userId, showAlert]);

  const removeMessage = useCallback(async (messageId: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
    const { error: err } = await deleteMessage(messageId);
    if (err) showAlert('Ошибка удаления', err);
  }, [showAlert]);

  return {
    messages,
    loading,
    sending,
    uploadingPhoto,
    error,
    sendText,
    sendPhoto,
    removeMessage,
    reload: loadMessages,
  };
}
