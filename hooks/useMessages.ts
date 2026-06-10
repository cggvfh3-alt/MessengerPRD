// Messages state and polling hook
import { useState, useCallback, useEffect, useRef } from 'react';
import { fetchMessages, sendTextMessage, sendImageMessage, deleteMessage, Message } from '@/services/messages';
import { pickAndUploadImage, takePhotoAndUpload } from '@/services/storage';

export function useMessages(chatId: string, userId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadMessages = useCallback(async () => {
    if (!chatId) return;
    const { data, error: err } = await fetchMessages(chatId);
    if (!err) setMessages(data);
  }, [chatId]);

  useEffect(() => {
    if (!chatId) return;
    setLoading(true);
    loadMessages().finally(() => setLoading(false));

    // Poll every 3 seconds for new messages
    intervalRef.current = setInterval(loadMessages, 3000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [chatId, loadMessages]);

  const sendText = useCallback(async (content: string): Promise<boolean> => {
    if (!content.trim()) return false;
    setSending(true);
    const { data, error: err } = await sendTextMessage(chatId, userId, content.trim());
    if (err) { setError(err); setSending(false); return false; }
    if (data) {
      setMessages((prev) => [...prev, { ...data, sender: { username: null, email: '' } }]);
    }
    setSending(false);
    return true;
  }, [chatId, userId]);

  const sendPhoto = useCallback(async (source: 'gallery' | 'camera'): Promise<boolean> => {
    setUploadingPhoto(true);
    const { url, error: uploadErr } = source === 'camera'
      ? await takePhotoAndUpload(userId)
      : await pickAndUploadImage(userId);

    if (uploadErr) { setError(uploadErr); setUploadingPhoto(false); return false; }
    if (!url) { setUploadingPhoto(false); return false; }

    const { data, error: msgErr } = await sendImageMessage(chatId, userId, url);
    if (msgErr) { setError(msgErr); setUploadingPhoto(false); return false; }
    if (data) {
      setMessages((prev) => [...prev, { ...data, sender: { username: null, email: '' } }]);
    }
    setUploadingPhoto(false);
    return true;
  }, [chatId, userId]);

  const removeMessage = useCallback(async (messageId: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
    await deleteMessage(messageId);
  }, []);

  return { messages, loading, sending, uploadingPhoto, error, sendText, sendPhoto, removeMessage, reload: loadMessages };
}
