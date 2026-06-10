/*
 * @Description: Chat List — main messenger screen
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth, useAlert } from '@/template';
import { Colors, Font, Spacing, Radius } from '@/constants/theme';
import { useChats, useUserSearch } from '@/hooks/useChats';
import { Chat } from '@/services/chats';

function formatTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
}

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

const AVATAR_COLORS = ['#2DA8FF', '#A371F7', '#00D4AA', '#D29922', '#F85149', '#3FB950'];

export default function ChatsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { showAlert } = useAlert();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState(false);

  const { chats, loading, loadChats, startDirectChat } = useChats(user?.id || '');
  const { results, loading: searchLoading, search, clear } = useUserSearch(user?.id || '');

  useEffect(() => {
    if (user?.id) loadChats();
  }, [user?.id]);

  const handleSearch = useCallback((q: string) => {
    setSearchQuery(q);
    q.trim() ? search(q) : clear();
  }, [search, clear]);

  const openChat = useCallback((chat: Chat) => {
    const chatName = chat.name || chat.other_user?.username || chat.other_user?.email || 'Чат';
    router.push({ pathname: '/chat/[id]', params: { id: chat.id, name: chatName } } as any);
  }, [router]);

  const startChat = useCallback(async (otherUserId: string, displayName: string) => {
    const chat = await startDirectChat(otherUserId);
    if (chat) {
      setSearchMode(false);
      setSearchQuery('');
      clear();
      router.push({ pathname: '/chat/[id]', params: { id: chat.id, name: displayName } } as any);
    } else {
      showAlert('Ошибка', 'Не удалось открыть чат');
    }
  }, [startDirectChat, router, clear, showAlert]);

  const handleLogout = () => {
    showAlert('Выйти из аккаунта?', 'Вы уверены?', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Выйти', style: 'destructive', onPress: async () => { await logout(); } },
    ]);
  };

  const renderChat = ({ item }: { item: Chat }) => {
    const name = item.name || item.other_user?.username || item.other_user?.email || 'Неизвестный';
    const initials = getInitials(name);
    const col = AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
    return (
      <TouchableOpacity style={styles.chatRow} onPress={() => openChat(item)} activeOpacity={0.75}>
        <View style={[styles.avatar, { backgroundColor: col + '33', borderColor: col + '55' }]}>
          <Text style={[styles.avatarText, { color: col }]}>{initials}</Text>
        </View>
        <View style={styles.chatInfo}>
          <View style={styles.chatTopRow}>
            <Text style={styles.chatName} numberOfLines={1}>{name}</Text>
            {item.last_message_time ? (
              <Text style={styles.chatTime}>{formatTime(item.last_message_time)}</Text>
            ) : null}
          </View>
          <Text style={styles.chatPreview} numberOfLines={1}>
            {item.last_message || 'Нет сообщений'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Сообщения</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => { setSearchMode(!searchMode); setSearchQuery(''); clear(); }}
            activeOpacity={0.75}
          >
            <MaterialIcons name={searchMode ? 'close' : 'person-search'} size={24} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={handleLogout} activeOpacity={0.75}>
            <MaterialIcons name="logout" size={22} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search bar */}
      {searchMode ? (
        <View style={styles.searchBar}>
          <MaterialIcons name="search" size={18} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={handleSearch}
            placeholder="Найти пользователя по email или username..."
            placeholderTextColor={Colors.textMuted}
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchLoading ? <ActivityIndicator size="small" color={Colors.primary} /> : null}
        </View>
      ) : null}

      {/* Current user info */}
      {!searchMode && user ? (
        <View style={styles.userBanner}>
          <MaterialIcons name="account-circle" size={16} color={Colors.primary} />
          <Text style={styles.userBannerText}>{user.username || user.email}</Text>
        </View>
      ) : null}

      {/* Search results */}
      {searchMode && searchQuery.trim() ? (
        <View style={styles.searchResults}>
          <Text style={styles.sectionLabel}>ПОЛЬЗОВАТЕЛИ</Text>
          {searchLoading ? (
            <ActivityIndicator color={Colors.primary} style={{ marginTop: 24 }} />
          ) : results.length === 0 ? (
            <View style={styles.emptyWrap}>
              <MaterialIcons name="person-off" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>Не найдено</Text>
            </View>
          ) : (
            <FlatList
              data={results}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const displayName = item.username || item.email;
                const col = AVATAR_COLORS[displayName.charCodeAt(0) % AVATAR_COLORS.length];
                return (
                  <TouchableOpacity
                    style={styles.userRow}
                    onPress={() => startChat(item.id, displayName)}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.userAvatar, { backgroundColor: col + '33' }]}>
                      <Text style={[styles.userAvatarText, { color: col }]}>
                        {getInitials(displayName)}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.userName}>{item.username || 'Без имени'}</Text>
                      <Text style={styles.userEmail}>{item.email}</Text>
                    </View>
                    <MaterialIcons name="send" size={20} color={Colors.primary} />
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>
      ) : (
        loading && chats.length === 0 ? (
          <View style={styles.centerWrap}>
            <ActivityIndicator color={Colors.primary} size="large" />
          </View>
        ) : chats.length === 0 ? (
          <View style={styles.centerWrap}>
            <MaterialIcons name="chat-bubble-outline" size={64} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>Нет чатов</Text>
            <Text style={styles.emptyDesc}>
              Нажмите иконку поиска чтобы найти пользователя и начать переписку
            </Text>
          </View>
        ) : (
          <FlatList
            data={chats}
            keyExtractor={(item) => item.id}
            renderItem={renderChat}
            refreshControl={
              <RefreshControl refreshing={loading} onRefresh={loadChats} tintColor={Colors.primary} />
            }
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: Font.lg, fontWeight: '800', color: Colors.textPrimary },
  headerRight: { flexDirection: 'row', gap: 4 },
  iconBtn: { padding: 8 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    margin: Spacing.md, backgroundColor: Colors.inputBg,
    borderRadius: Radius.lg, paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: Colors.border,
  },
  searchInput: { flex: 1, fontSize: Font.base, color: Colors.textPrimary },
  userBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: Spacing.md, paddingVertical: 6,
    backgroundColor: Colors.primary + '0D',
    borderBottomWidth: 1, borderBottomColor: Colors.primary + '22',
  },
  userBannerText: { fontSize: Font.xs, color: Colors.textSecondary },
  chatRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: 12,
  },
  avatar: {
    width: 50, height: 50, borderRadius: 25,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, marginRight: 12,
  },
  avatarText: { fontSize: Font.md, fontWeight: '700' },
  chatInfo: { flex: 1 },
  chatTopRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 3,
  },
  chatName: { fontSize: Font.base, fontWeight: '600', color: Colors.textPrimary, flex: 1, marginRight: 8 },
  chatTime: { fontSize: Font.xs, color: Colors.textMuted },
  chatPreview: { fontSize: Font.sm, color: Colors.textSecondary },
  separator: { height: 1, backgroundColor: Colors.border, marginLeft: 74 },
  searchResults: { flex: 1, paddingHorizontal: Spacing.md, paddingTop: 12 },
  sectionLabel: { fontSize: Font.xs, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1, marginBottom: 8 },
  userRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  userAvatar: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  userAvatarText: { fontSize: Font.base, fontWeight: '700' },
  userName: { fontSize: Font.base, fontWeight: '600', color: Colors.textPrimary },
  userEmail: { fontSize: Font.sm, color: Colors.textSecondary },
  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 40 },
  emptyWrap: { alignItems: 'center', paddingTop: 48, gap: 12 },
  emptyTitle: { fontSize: Font.md, fontWeight: '700', color: Colors.textPrimary },
  emptyDesc: { fontSize: Font.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
});
