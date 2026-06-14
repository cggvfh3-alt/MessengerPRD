/*
 * @Description: Chat List — main messenger screen with unread badges + theme support
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth, useAlert } from '@/template';
import { useTheme } from '@/contexts/ThemeContext';
import { useChats, useUserSearch } from '@/hooks/useChats';
import { Chat } from '@/services/chats';
import { updateOnlineStatus } from '@/services/social';
import { AppState } from 'react-native';
import { useEffect as useRNEffect } from 'react';

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
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState(false);

  const { chats, loading, totalUnread, loadChats, startDirectChat } = useChats(user?.id || '');
  const { results, loading: searchLoading, search, clear } = useUserSearch(user?.id || '');

  // Online status management
  useEffect(() => {
    if (!user?.id) return;
    updateOnlineStatus(user.id, true);
    const sub = AppState.addEventListener('change', (state) => {
      updateOnlineStatus(user.id!, state === 'active');
    });
    return () => {
      sub.remove();
      if (user?.id) updateOnlineStatus(user.id, false);
    };
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) loadChats();
  }, [user?.id]);

  const handleSearch = useCallback((q: string) => {
    setSearchQuery(q);
    q.trim() ? search(q) : clear();
  }, [search, clear]);

  const openChat = useCallback((chat: Chat) => {
    const chatName = chat.name || chat.other_user?.username || chat.other_user?.email || 'Чат';
    router.push({ pathname: '/chat/[id]', params: { id: chat.id, name: chatName, otherId: chat.other_user?.id || '' } } as any);
  }, [router]);

  const startChat = useCallback(async (otherUserId: string, displayName: string) => {
    const chat = await startDirectChat(otherUserId);
    if (chat) {
      setSearchMode(false);
      setSearchQuery('');
      clear();
      router.push({ pathname: '/chat/[id]', params: { id: chat.id, name: displayName, otherId: otherUserId } } as any);
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
    const hasUnread = (item.unread_count || 0) > 0;

    return (
      <TouchableOpacity
        style={[styles.chatRow, { borderBottomColor: colors.border }]}
        onPress={() => openChat(item)}
        activeOpacity={0.75}
      >
        <View style={[styles.avatar, { backgroundColor: col + '33', borderColor: col + '55' }]}>
          <Text style={[styles.avatarText, { color: col }]}>{initials}</Text>
        </View>
        <View style={styles.chatInfo}>
          <View style={styles.chatTopRow}>
            <Text style={[styles.chatName, { color: colors.textPrimary }]} numberOfLines={1}>{name}</Text>
            <View style={styles.chatMeta}>
              {item.last_message_time ? (
                <Text style={[styles.chatTime, { color: colors.textMuted }]}>{formatTime(item.last_message_time)}</Text>
              ) : null}
              {hasUnread ? (
                <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
                  <Text style={styles.unreadText}>{(item.unread_count || 0) > 99 ? '99+' : item.unread_count}</Text>
                </View>
              ) : null}
            </View>
          </View>
          <Text
            style={[styles.chatPreview, { color: hasUnread ? colors.textPrimary : colors.textSecondary }, hasUnread && { fontWeight: '500' }]}
            numberOfLines={1}
          >
            {item.last_message || 'Нет сообщений'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top, backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>ИТП</Text>
          {totalUnread > 0 ? (
            <View style={[styles.headerBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.headerBadgeText}>{totalUnread > 99 ? '99+' : totalUnread}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => { setSearchMode(!searchMode); setSearchQuery(''); clear(); }}
            activeOpacity={0.75}
          >
            <MaterialIcons name={searchMode ? 'close' : 'person-search'} size={24} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/settings' as any)} activeOpacity={0.75}>
            <MaterialIcons name="settings" size={22} color={colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={handleLogout} activeOpacity={0.75}>
            <MaterialIcons name="logout" size={22} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search bar */}
      {searchMode ? (
        <View style={[styles.searchBar, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
          <MaterialIcons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            value={searchQuery}
            onChangeText={handleSearch}
            placeholder="Найти пользователя..."
            placeholderTextColor={colors.textMuted}
            autoFocus
            autoCapitalize="none"
          />
          {searchLoading ? <ActivityIndicator size="small" color={colors.primary} /> : null}
        </View>
      ) : null}

      {!searchMode && user ? (
        <View style={[styles.userBanner, { backgroundColor: colors.primary + '0D', borderBottomColor: colors.primary + '22' }]}>
          <MaterialIcons name="account-circle" size={16} color={colors.primary} />
          <Text style={[styles.userBannerText, { color: colors.textSecondary }]}>{user.username || user.email}</Text>
        </View>
      ) : null}

      {/* Search results */}
      {searchMode && searchQuery.trim() ? (
        <View style={[styles.searchResults, { backgroundColor: colors.bg }]}>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>ПОЛЬЗОВАТЕЛИ</Text>
          {searchLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
          ) : results.length === 0 ? (
            <View style={styles.emptyWrap}>
              <MaterialIcons name="person-off" size={48} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Не найдено</Text>
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
                    style={[styles.userRow, { borderBottomColor: colors.border }]}
                    onPress={() => startChat(item.id, displayName)}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.userAvatar, { backgroundColor: col + '33' }]}>
                      <Text style={[styles.userAvatarText, { color: col }]}>{getInitials(displayName)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.userName, { color: colors.textPrimary }]}>{item.username || 'Без имени'}</Text>
                      <Text style={[styles.userEmail, { color: colors.textSecondary }]}>{item.email}</Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={20} color={colors.primary} />
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>
      ) : loading && chats.length === 0 ? (
        <View style={styles.centerWrap}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : chats.length === 0 ? (
        <View style={styles.centerWrap}>
          <MaterialIcons name="chat-bubble-outline" size={64} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Нет чатов</Text>
          <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
            Нажмите иконку поиска, чтобы найти пользователя
          </Text>
        </View>
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(item) => item.id}
          renderItem={renderChat}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={loadChats} tintColor={colors.primary} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 20, fontWeight: '800' },
  headerBadge: { borderRadius: 999, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  headerBadgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  headerRight: { flexDirection: 'row', gap: 4 },
  iconBtn: { padding: 8 },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, margin: 16, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: 15 },
  userBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 6, borderBottomWidth: 1 },
  userBannerText: { fontSize: 12 },
  chatRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  avatar: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', borderWidth: 1, marginRight: 12 },
  avatarText: { fontSize: 17, fontWeight: '700' },
  chatInfo: { flex: 1 },
  chatTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  chatName: { fontSize: 15, fontWeight: '600', flex: 1, marginRight: 8 },
  chatMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chatTime: { fontSize: 12 },
  unreadBadge: { borderRadius: 999, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  unreadText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  chatPreview: { fontSize: 13 },
  searchResults: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 8 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1 },
  userAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  userAvatarText: { fontSize: 15, fontWeight: '700' },
  userName: { fontSize: 15, fontWeight: '600' },
  userEmail: { fontSize: 13 },
  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 40 },
  emptyWrap: { alignItems: 'center', paddingTop: 48, gap: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '700' },
  emptyDesc: { fontSize: 14, color: '#8B949E', textAlign: 'center', lineHeight: 20 },
});
