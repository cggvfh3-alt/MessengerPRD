/*
 * @Description: Chat screen — full featured with reactions, reply, edit, voice, typing
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform,
  ActivityIndicator, Modal, Pressable, Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { Audio } from 'expo-av';
import { useAuth } from '@/template';
import { useTheme } from '@/contexts/ThemeContext';
import { useMessages } from '@/hooks/useMessages';
import { Message } from '@/services/messages';
import { getOnlineStatus, formatLastSeen } from '@/services/social';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function formatMsgTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

const REACTIONS = ['👍', '❤️', '😂', '🔥', '😎', '👎'];

function VoicePlayer({ url, isMe, colors }: { url: string; isMe: boolean; colors: any }) {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);

  const loadSound = useCallback(async () => {
    try {
      const { sound: s, status } = await Audio.Sound.createAsync(
        { uri: url },
        {},
        (st) => {
          if (st.isLoaded) {
            setPosition(st.positionMillis || 0);
            setDuration(st.durationMillis || 0);
            if (st.didJustFinish) {
              setPlaying(false);
              setPosition(0);
            }
          }
        }
      );
      setSound(s);
    } catch {}
  }, [url]);

  useEffect(() => {
    loadSound();
    return () => { sound?.unloadAsync(); };
  }, []);

  const toggle = async () => {
    if (!sound) return;
    if (playing) {
      await sound.pauseAsync();
      setPlaying(false);
    } else {
      await sound.playAsync();
      setPlaying(true);
    }
  };

  const formatDur = (ms: number) => {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };

  return (
    <TouchableOpacity style={[voiceStyles.container, { backgroundColor: isMe ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }]} onPress={toggle} activeOpacity={0.8}>
      <MaterialIcons name={playing ? 'pause' : 'play-arrow'} size={28} color={isMe ? '#fff' : colors.primary} />
      <View style={voiceStyles.waveContainer}>
        {Array.from({ length: 20 }).map((_, i) => (
          <View
            key={i}
            style={[voiceStyles.bar, {
              height: 4 + Math.random() * 14,
              backgroundColor: (duration > 0 && (i / 20) < (position / duration))
                ? (isMe ? '#fff' : colors.primary)
                : (isMe ? 'rgba(255,255,255,0.4)' : colors.border),
            }]}
          />
        ))}
      </View>
      <Text style={{ fontSize: 11, color: isMe ? 'rgba(255,255,255,0.7)' : colors.textMuted }}>
        {formatDur(duration > 0 ? duration : 0)}
      </Text>
    </TouchableOpacity>
  );
}

export default function ChatScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
  const navigation = useNavigation();
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const [previewImg, setPreviewImg] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMsg, setEditingMsg] = useState<Message | null>(null);
  const [reactionTarget, setReactionTarget] = useState<Message | null>(null);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingSecs, setRecordingSecs] = useState(0);
  const [onlineStatus, setOnlineStatus] = useState<{ is_online: boolean; last_seen_at: string | null }>({ is_online: false, last_seen_at: null });
  const flatRef = useRef<FlatList>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Get other user id from chat params — we'll pass it optionally
  const otherId = useLocalSearchParams<{ otherId?: string }>().otherId;

  const {
    messages, loading, sending, uploadingPhoto,
    sendText, sendPhoto, sendVoice, editMsg, removeMessage, addReaction, forward,
    typingUsers, handleTyping, reload,
  } = useMessages(id || '', user?.id || '');

  useEffect(() => {
    navigation.setOptions({ title: name || 'Чат' });
  }, [name, navigation]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  // Online status polling (if direct chat)
  useEffect(() => {
    if (!otherId) return;
    const load = async () => {
      const status = await getOnlineStatus(otherId);
      setOnlineStatus(status);
    };
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, [otherId]);

  const handleSend = async () => {
    if (!text.trim() && !editingMsg) return;
    if (editingMsg) {
      await editMsg(editingMsg.id, text.trim());
      setEditingMsg(null);
      setText('');
    } else {
      const t = text;
      setText('');
      await sendText(t, replyTo?.id);
      setReplyTo(null);
    }
  };

  const handlePhotoMenu = () => {
    Alert.alert('Добавить фото', '', [
      { text: 'Галерея', onPress: () => sendPhoto('gallery', replyTo?.id) },
      { text: 'Камера', onPress: () => sendPhoto('camera', replyTo?.id) },
      { text: 'Отмена', style: 'cancel' },
    ]);
  };

  const handleLongPress = (msg: Message) => {
    const isMe = msg.sender_id === user?.id;
    const actions: any[] = [
      { text: 'Реакция', onPress: () => setReactionTarget(msg) },
      { text: 'Ответить', onPress: () => setReplyTo(msg) },
    ];
    if (isMe) {
      if (msg.type === 'text') {
        actions.push({ text: 'Редактировать', onPress: () => { setEditingMsg(msg); setText(msg.content || ''); } });
      }
      actions.push({ text: 'Удалить у себя', onPress: () => removeMessage(msg.id, false) });
      actions.push({ text: 'Удалить у всех', style: 'destructive', onPress: () => removeMessage(msg.id, true) });
    }
    actions.push({ text: 'Отмена', style: 'cancel' });
    Alert.alert('Сообщение', '', actions);
  };

  // Voice recording
  const startRecording = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await rec.startAsync();
      setRecording(rec);
      setRecordingSecs(0);
      timerRef.current = setInterval(() => setRecordingSecs((s) => s + 1), 1000);
    } catch {}
  };

  const stopRecording = async () => {
    if (!recording) return;
    if (timerRef.current) clearInterval(timerRef.current);
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      setRecordingSecs(0);
      if (uri) await sendVoice(uri, replyTo?.id);
      setReplyTo(null);
    } catch {}
  };

  const cancelRecording = async () => {
    if (!recording) return;
    if (timerRef.current) clearInterval(timerRef.current);
    try { await recording.stopAndUnloadAsync(); } catch {}
    setRecording(null);
    setRecordingSecs(0);
  };

  const renderReplyPreview = (replyMsg: { content: string | null; type: string; sender?: { username: string | null } } | null) => {
    if (!replyMsg) return null;
    const senderName = replyMsg.sender?.username || '...';
    const preview = replyMsg.type === 'image' ? '📷 Фото' : replyMsg.type === 'voice' ? '🎤 Голосовое' : replyMsg.content || '';
    return (
      <View style={[replyStyles.preview, { borderLeftColor: colors.primary, backgroundColor: colors.primary + '15' }]}>
        <Text style={[replyStyles.sender, { color: colors.primary }]}>{senderName}</Text>
        <Text style={[replyStyles.text, { color: colors.textSecondary }]} numberOfLines={1}>{preview}</Text>
      </View>
    );
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMe = item.sender_id === user?.id;

    if (item.deleted_for_all) {
      return (
        <View style={[styles.msgRow, isMe ? styles.msgRowMe : styles.msgRowThem]}>
          <View style={[styles.bubble, isMe ? { backgroundColor: colors.outgoingBubble } : { backgroundColor: colors.incomingBubble }, { opacity: 0.6 }]}>
            <Text style={[styles.msgText, { color: colors.textSecondary, fontStyle: 'italic' }]}>Сообщение удалено</Text>
          </View>
        </View>
      );
    }

    return (
      <TouchableOpacity
        onLongPress={() => handleLongPress(item)}
        activeOpacity={0.85}
        style={[styles.msgRow, isMe ? styles.msgRowMe : styles.msgRowThem]}
      >
        {!isMe ? (
          <View style={[styles.msgAvatar, { backgroundColor: colors.primary + '33' }]}>
            <Text style={[styles.msgAvatarText, { color: colors.primary }]}>
              {(item.sender?.username || item.sender?.email || '?')[0].toUpperCase()}
            </Text>
          </View>
        ) : null}

        <View style={{ maxWidth: '78%' }}>
          {/* Forwarded badge */}
          {item.forwarded_from_id ? (
            <Text style={[styles.forwardedLabel, { color: colors.textMuted }]}>↪ Пересланное</Text>
          ) : null}

          <View style={[styles.bubble, isMe ? { backgroundColor: colors.outgoingBubble } : { backgroundColor: colors.incomingBubble }]}>
            {!isMe && item.sender?.username ? (
              <Text style={[styles.senderName, { color: colors.primary }]}>{item.sender.username}</Text>
            ) : null}

            {/* Reply preview */}
            {item.reply_to ? renderReplyPreview(item.reply_to) : null}

            {item.type === 'image' && item.media_url ? (
              <TouchableOpacity onPress={() => setPreviewImg(item.media_url)} activeOpacity={0.9}>
                <Image source={{ uri: item.media_url }} style={styles.msgImage} contentFit="cover" transition={200} />
              </TouchableOpacity>
            ) : item.type === 'voice' && item.media_url ? (
              <VoicePlayer url={item.media_url} isMe={isMe} colors={colors} />
            ) : (
              <Text style={[styles.msgText, { color: colors.textPrimary }]}>{item.content}</Text>
            )}

            <View style={styles.msgMeta}>
              {item.edited_at ? <Text style={[styles.editedLabel, { color: isMe ? 'rgba(255,255,255,0.5)' : colors.textMuted }]}>ред.</Text> : null}
              <Text style={[styles.msgTime, isMe ? styles.msgTimeMe : { color: colors.textMuted }]}>
                {formatMsgTime(item.created_at)}
              </Text>
              {isMe ? (
                <MaterialIcons
                  name={item.is_read ? 'done-all' : 'done'}
                  size={14}
                  color={item.is_read ? colors.accent : 'rgba(255,255,255,0.5)'}
                  style={{ marginLeft: 2 }}
                />
              ) : null}
            </View>
          </View>

          {/* Reactions */}
          {item.reactions && item.reactions.length > 0 ? (
            <View style={[styles.reactionsRow, isMe && { justifyContent: 'flex-end' }]}>
              {item.reactions.map((r) => (
                <TouchableOpacity
                  key={r.emoji}
                  style={[styles.reactionChip, {
                    backgroundColor: r.hasReacted ? colors.primary + '33' : colors.bgSection,
                    borderColor: r.hasReacted ? colors.primary + '66' : colors.border,
                  }]}
                  onPress={() => addReaction(item.id, r.emoji)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.reactionEmoji}>{r.emoji}</Text>
                  {r.count > 1 ? <Text style={[styles.reactionCount, { color: colors.textSecondary }]}>{r.count}</Text> : null}
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  const subtitleText = typingUsers.length > 0
    ? `${typingUsers[0]} печатает...`
    : otherId
    ? formatLastSeen(onlineStatus.last_seen_at, onlineStatus.is_online)
    : '';

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Subtitle (online/typing) */}
      {subtitleText ? (
        <View style={[styles.subtitle, { backgroundColor: colors.bgCard, borderBottomColor: colors.border }]}>
          <Text style={[styles.subtitleText, { color: typingUsers.length > 0 ? colors.primary : colors.textMuted }]}>
            {subtitleText}
          </Text>
        </View>
      ) : null}

      {loading && messages.length === 0 ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : messages.length === 0 ? (
        <View style={styles.emptyWrap}>
          <MaterialIcons name="chat-bubble-outline" size={48} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textPrimary }]}>Начните переписку</Text>
          <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>Отправьте первое сообщение или фото</Text>
        </View>
      ) : (
        <FlatList
          ref={flatRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.msgList}
          showsVerticalScrollIndicator={false}
          onLayout={() => flatRef.current?.scrollToEnd({ animated: false })}
        />
      )}

      {/* Reply / Edit bar */}
      {replyTo ? (
        <View style={[styles.replyBar, { backgroundColor: colors.bgCard, borderTopColor: colors.border }]}>
          <View style={[styles.replyIndicator, { backgroundColor: colors.primary }]} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.replyBarTitle, { color: colors.primary }]}>Ответ</Text>
            <Text style={[styles.replyBarText, { color: colors.textSecondary }]} numberOfLines={1}>
              {replyTo.type === 'image' ? '📷 Фото' : replyTo.type === 'voice' ? '🎤 Голосовое' : replyTo.content}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setReplyTo(null)} activeOpacity={0.7}>
            <MaterialIcons name="close" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      ) : editingMsg ? (
        <View style={[styles.replyBar, { backgroundColor: colors.warning + '22', borderTopColor: colors.warning + '44' }]}>
          <View style={[styles.replyIndicator, { backgroundColor: colors.warning }]} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.replyBarTitle, { color: colors.warning }]}>Редактирование</Text>
            <Text style={[styles.replyBarText, { color: colors.textSecondary }]} numberOfLines={1}>{editingMsg.content}</Text>
          </View>
          <TouchableOpacity onPress={() => { setEditingMsg(null); setText(''); }} activeOpacity={0.7}>
            <MaterialIcons name="close" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Recording indicator */}
      {recording ? (
        <View style={[styles.recordingBar, { backgroundColor: colors.danger + '22', borderTopColor: colors.border }]}>
          <View style={styles.recordingDot} />
          <Text style={[styles.recordingText, { color: colors.danger }]}>
            {String(Math.floor(recordingSecs / 60)).padStart(2, '0')}:{String(recordingSecs % 60).padStart(2, '0')}
          </Text>
          <Text style={[{ flex: 1, color: colors.textSecondary, fontSize: 13 }]}>Запись голосового...</Text>
          <TouchableOpacity onPress={cancelRecording} style={{ padding: 8 }}>
            <MaterialIcons name="delete" size={22} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Input bar */}
      <View style={[styles.inputBar, { backgroundColor: colors.bgCard, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={styles.attachBtn}
          onPress={handlePhotoMenu}
          disabled={uploadingPhoto}
          activeOpacity={0.75}
        >
          {uploadingPhoto ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <MaterialIcons name="add-photo-alternate" size={26} color={colors.primary} />
          )}
        </TouchableOpacity>

        <TextInput
          style={[styles.textInput, { color: colors.textPrimary, backgroundColor: colors.inputBg, borderColor: colors.border }]}
          value={text}
          onChangeText={(t) => { setText(t); handleTyping(); }}
          placeholder="Сообщение..."
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={4000}
          editable={!recording}
        />

        {text.trim() || editingMsg ? (
          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: colors.primary }]}
            onPress={handleSend}
            disabled={sending}
            activeOpacity={0.85}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <MaterialIcons name={editingMsg ? 'check' : 'send'} size={20} color="#fff" />
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: recording ? colors.danger : colors.bgSection }]}
            onPressIn={!recording ? startRecording : undefined}
            onPressOut={recording ? stopRecording : undefined}
            onLongPress={!recording ? startRecording : undefined}
            activeOpacity={0.85}
          >
            <MaterialIcons name="mic" size={22} color={recording ? '#fff' : colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Image preview modal */}
      <Modal visible={previewImg !== null} transparent animationType="fade">
        <Pressable style={styles.previewOverlay} onPress={() => setPreviewImg(null)}>
          <Image source={{ uri: previewImg || '' }} style={styles.previewImage} contentFit="contain" />
          <TouchableOpacity style={styles.previewClose} onPress={() => setPreviewImg(null)}>
            <MaterialIcons name="close" size={28} color="#fff" />
          </TouchableOpacity>
        </Pressable>
      </Modal>

      {/* Reaction picker modal */}
      <Modal visible={!!reactionTarget} transparent animationType="fade" onRequestClose={() => setReactionTarget(null)}>
        <Pressable style={styles.reactionOverlay} onPress={() => setReactionTarget(null)}>
          <View style={[styles.reactionPicker, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            {REACTIONS.map((emoji) => (
              <TouchableOpacity
                key={emoji}
                style={styles.reactionPickerBtn}
                onPress={() => {
                  if (reactionTarget) addReaction(reactionTarget.id, emoji);
                  setReactionTarget(null);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.reactionPickerEmoji}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  subtitle: { paddingHorizontal: 16, paddingVertical: 4, borderBottomWidth: 1 },
  subtitleText: { fontSize: 12 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 40 },
  emptyText: { fontSize: 17, fontWeight: '700' },
  emptyDesc: { fontSize: 14, textAlign: 'center' },
  msgList: { paddingHorizontal: 8, paddingVertical: 12, gap: 4 },
  msgRow: { flexDirection: 'row', marginVertical: 2, alignItems: 'flex-end' },
  msgRowMe: { justifyContent: 'flex-end' },
  msgRowThem: { justifyContent: 'flex-start' },
  msgAvatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 6, marginBottom: 2 },
  msgAvatarText: { fontSize: 11, fontWeight: '700' },
  forwardedLabel: { fontSize: 11, marginBottom: 2, marginLeft: 2 },
  bubble: { borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8, shadowColor: '#000', shadowOpacity: 0.1, shadowOffset: { width: 0, height: 1 }, shadowRadius: 3, elevation: 2 },
  senderName: { fontSize: 12, fontWeight: '700', marginBottom: 3 },
  msgText: { fontSize: 15, lineHeight: 21 },
  msgImage: { width: 220, height: 180, borderRadius: 12, marginBottom: 4 },
  msgMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 4, gap: 2 },
  editedLabel: { fontSize: 10, fontStyle: 'italic' },
  msgTime: { fontSize: 10 },
  msgTimeMe: { color: 'rgba(255,255,255,0.6)' },
  reactionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4, paddingHorizontal: 4 },
  reactionChip: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 12, borderWidth: 1 },
  reactionEmoji: { fontSize: 14 },
  reactionCount: { fontSize: 11, fontWeight: '600' },
  replyBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, gap: 10, borderTopWidth: 1 },
  replyIndicator: { width: 3, height: 36, borderRadius: 2 },
  replyBarTitle: { fontSize: 12, fontWeight: '700' },
  replyBarText: { fontSize: 13 },
  recordingBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, gap: 10, borderTopWidth: 1 },
  recordingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#F85149' },
  recordingText: { fontSize: 15, fontWeight: '700', minWidth: 40 },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 8, paddingVertical: 8, borderTopWidth: 1, gap: 6 },
  attachBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
  textInput: { flex: 1, borderRadius: 22, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 10, fontSize: 15, maxHeight: 120, borderWidth: 1 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  previewOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' },
  previewImage: { width: '95%', height: '80%' },
  previewClose: { position: 'absolute', top: 50, right: 20, padding: 8 },
  reactionOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  reactionPicker: { flexDirection: 'row', borderRadius: 30, padding: 8, gap: 4, borderWidth: 1, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 },
  reactionPickerBtn: { padding: 8 },
  reactionPickerEmoji: { fontSize: 28 },
});

const replyStyles = StyleSheet.create({
  preview: { borderLeftWidth: 3, paddingLeft: 8, paddingVertical: 4, marginBottom: 6, borderRadius: 4 },
  sender: { fontSize: 12, fontWeight: '700' },
  text: { fontSize: 13 },
});

const voiceStyles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 12, minWidth: 180 },
  waveContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 2, height: 24 },
  bar: { width: 3, borderRadius: 2 },
});
