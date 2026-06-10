/*
 * @Description: Chat screen — send text and photos
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform,
  ActivityIndicator, ActionSheetIOS, Alert, Modal, Pressable,
} from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useAuth } from '@/template';
import { Colors, Font, Spacing, Radius } from '@/constants/theme';
import { useMessages } from '@/hooks/useMessages';
import { Message } from '@/services/messages';

function formatMsgTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

export default function ChatScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
  const navigation = useNavigation();
  const { user } = useAuth();
  const [text, setText] = useState('');
  const [previewImg, setPreviewImg] = useState<string | null>(null);
  const flatRef = useRef<FlatList>(null);

  const {
    messages, loading, sending, uploadingPhoto,
    sendText, sendPhoto, removeMessage, error,
  } = useMessages(id || '', user?.id || '');

  useEffect(() => {
    navigation.setOptions({ title: name || 'Чат' });
  }, [name, navigation]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const handleSend = async () => {
    if (!text.trim()) return;
    const t = text;
    setText('');
    await sendText(t);
  };

  const handlePhotoMenu = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Отмена', 'Выбрать из галереи', 'Снять фото'], cancelButtonIndex: 0 },
        (idx) => {
          if (idx === 1) sendPhoto('gallery');
          if (idx === 2) sendPhoto('camera');
        }
      );
    } else {
      Alert.alert('Добавить фото', '', [
        { text: 'Галерея', onPress: () => sendPhoto('gallery') },
        { text: 'Камера', onPress: () => sendPhoto('camera') },
        { text: 'Отмена', style: 'cancel' },
      ]);
    }
  };

  const handleLongPress = (msg: Message) => {
    if (msg.sender_id !== user?.id) return;
    const actions = [
      { text: 'Удалить', style: 'destructive' as const, onPress: () => removeMessage(msg.id) },
      { text: 'Отмена', style: 'cancel' as const },
    ];
    Alert.alert('Сообщение', '', actions);
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMe = item.sender_id === user?.id;
    return (
      <TouchableOpacity
        onLongPress={() => handleLongPress(item)}
        activeOpacity={0.85}
        style={[styles.msgRow, isMe ? styles.msgRowMe : styles.msgRowThem]}
      >
        {!isMe ? (
          <View style={styles.msgAvatar}>
            <Text style={styles.msgAvatarText}>
              {(item.sender?.username || item.sender?.email || '?')[0].toUpperCase()}
            </Text>
          </View>
        ) : null}

        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
          {!isMe && item.sender?.username ? (
            <Text style={styles.senderName}>{item.sender.username}</Text>
          ) : null}

          {item.type === 'image' && item.media_url ? (
            <TouchableOpacity onPress={() => setPreviewImg(item.media_url)} activeOpacity={0.9}>
              <Image
                source={{ uri: item.media_url }}
                style={styles.msgImage}
                contentFit="cover"
                transition={200}
              />
            </TouchableOpacity>
          ) : (
            <Text style={styles.msgText}>{item.content}</Text>
          )}

          <Text style={[styles.msgTime, isMe ? styles.msgTimeMe : styles.msgTimeThem]}>
            {formatMsgTime(item.created_at)}
            {isMe ? '  ✓✓' : ''}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {loading && messages.length === 0 ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : messages.length === 0 ? (
        <View style={styles.emptyWrap}>
          <MaterialIcons name="chat-bubble-outline" size={48} color={Colors.textMuted} />
          <Text style={styles.emptyText}>Начните переписку</Text>
          <Text style={styles.emptyDesc}>Отправьте первое сообщение или фото</Text>
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

      {/* Input bar */}
      <View style={styles.inputBar}>
        <TouchableOpacity
          style={styles.attachBtn}
          onPress={handlePhotoMenu}
          disabled={uploadingPhoto}
          activeOpacity={0.75}
        >
          {uploadingPhoto ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <MaterialIcons name="add-photo-alternate" size={26} color={Colors.primary} />
          )}
        </TouchableOpacity>

        <TextInput
          style={styles.textInput}
          value={text}
          onChangeText={setText}
          placeholder="Сообщение..."
          placeholderTextColor={Colors.textMuted}
          multiline
          maxLength={4000}
          returnKeyType="send"
          blurOnSubmit={false}
        />

        <TouchableOpacity
          style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!text.trim() || sending}
          activeOpacity={0.85}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <MaterialIcons name="send" size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      {/* Image preview modal */}
      <Modal visible={previewImg !== null} transparent animationType="fade">
        <Pressable style={styles.previewOverlay} onPress={() => setPreviewImg(null)}>
          <Image
            source={{ uri: previewImg || '' }}
            style={styles.previewImage}
            contentFit="contain"
          />
          <TouchableOpacity style={styles.previewClose} onPress={() => setPreviewImg(null)}>
            <MaterialIcons name="close" size={28} color="#fff" />
          </TouchableOpacity>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 40 },
  emptyText: { fontSize: Font.md, fontWeight: '700', color: Colors.textPrimary },
  emptyDesc: { fontSize: Font.sm, color: Colors.textSecondary, textAlign: 'center' },
  msgList: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.md, gap: 4 },
  msgRow: { flexDirection: 'row', marginVertical: 3, alignItems: 'flex-end' },
  msgRowMe: { justifyContent: 'flex-end' },
  msgRowThem: { justifyContent: 'flex-start' },
  msgAvatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.primary + '33',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 6, marginBottom: 2,
  },
  msgAvatarText: { fontSize: 11, fontWeight: '700', color: Colors.primary },
  bubble: {
    maxWidth: '78%', borderRadius: Radius.xl, paddingHorizontal: 12, paddingVertical: 8,
    shadowColor: '#000', shadowOpacity: 0.15, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4,
    elevation: 2,
  },
  bubbleMe: { backgroundColor: Colors.outgoingBubble, borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: Colors.incomingBubble, borderBottomLeftRadius: 4 },
  senderName: { fontSize: Font.xs, fontWeight: '700', color: Colors.primary, marginBottom: 3 },
  msgText: { fontSize: Font.base, color: Colors.textPrimary, lineHeight: 21 },
  msgImage: { width: 220, height: 180, borderRadius: Radius.lg, marginBottom: 4 },
  msgTime: { fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
  msgTimeMe: { color: Colors.primary + 'BB' },
  msgTimeThem: { color: Colors.textMuted },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: 8, paddingVertical: 8,
    backgroundColor: Colors.bgCard,
    borderTopWidth: 1, borderTopColor: Colors.border,
    gap: 6,
  },
  attachBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
  textInput: {
    flex: 1, backgroundColor: Colors.inputBg,
    borderRadius: Radius.xl, paddingHorizontal: 14,
    paddingTop: 10, paddingBottom: 10,
    fontSize: Font.base, color: Colors.textPrimary,
    maxHeight: 120,
    borderWidth: 1, borderColor: Colors.border,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: Colors.textMuted },
  previewOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center', justifyContent: 'center',
  },
  previewImage: { width: '95%', height: '80%' },
  previewClose: { position: 'absolute', top: 50, right: 20, padding: 8 },
});
