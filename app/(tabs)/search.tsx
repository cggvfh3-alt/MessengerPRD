/*
 * @Description: Global Search — users, posts, chats, messages
 */
import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, FlatList,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/template';
import { useTheme } from '@/contexts/ThemeContext';
import { searchUsersGlobal, UserProfileFull } from '@/services/social';
import { searchPosts, Post } from '@/services/posts';
import { useChats } from '@/hooks/useChats';
import { Image } from 'expo-image';

const AVATAR_COLORS = ['#2DA8FF', '#A371F7', '#00D4AA', '#D29922', '#F85149', '#3FB950'];

function getAvatarColor(name: string) {
  return AVATAR_COLORS[(name.charCodeAt(0) || 0) % AVATAR_COLORS.length];
}

function Avatar({ name, avatarUrl, size = 40 }: { name: string; avatarUrl?: string | null; size?: number }) {
  const col = getAvatarColor(name);
  if (avatarUrl) {
    return <Image source={{ uri: avatarUrl }} style={{ width: size, height: size, borderRadius: size / 2 }} contentFit="cover" transition={200} />;
  }
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: col + '33', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: size * 0.4, fontWeight: '700', color: col }}>{(name[0] || '?').toUpperCase()}</Text>
    </View>
  );
}

type SearchTab = 'users' | 'posts' | 'chats';

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<SearchTab>('users');
  const [users, setUsers] = useState<UserProfileFull[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);

  const { chats, loadChats } = useChats(user?.id || '');

  useEffect(() => {
    if (user?.id) loadChats();
  }, [user?.id]);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim() || !user?.id) {
      setUsers([]);
      setPosts([]);
      return;
    }
    setLoading(true);
    const [u, p] = await Promise.all([
      searchUsersGlobal(q.trim(), user.id),
      searchPosts(q.trim(), user.id),
    ]);
    setUsers(u.data);
    setPosts(p.data);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    const timer = setTimeout(() => doSearch(query), 400);
    return () => clearTimeout(timer);
  }, [query, doSearch]);

  const filteredChats = chats.filter((c) => {
    const name = c.name || c.other_user?.username || c.other_user?.email || '';
    return name.toLowerCase().includes(query.toLowerCase());
  });

  const openChat = useCallback((chatId: string, chatName: string) => {
    router.push({ pathname: '/chat/[id]', params: { id: chatId, name: chatName } } as any);
  }, [router]);

  const renderUser = ({ item }: { item: UserProfileFull }) => {
    const name = item.username || item.email;
    return (
      <TouchableOpacity
        style={[styles.row, { borderBottomColor: colors.border }]}
        onPress={() => router.push(`/profile/${item.id}` as any)}
        activeOpacity={0.75}
      >
        <Avatar name={name} avatarUrl={item.avatar_url} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>{name}</Text>
          <Text style={[styles.rowSub, { color: colors.textSecondary }]}>{item.email}</Text>
        </View>
        <MaterialIcons name="chevron-right" size={20} color={colors.textMuted} />
      </TouchableOpacity>
    );
  };

  const renderPost = ({ item }: { item: Post }) => {
    const authorName = item.author?.username || item.author?.email || '?';
    return (
      <TouchableOpacity
        style={[styles.row, { borderBottomColor: colors.border }]}
        activeOpacity={0.75}
      >
        <Avatar name={authorName} avatarUrl={item.author?.avatar_url} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.rowTitle, { color: colors.textPrimary }]} numberOfLines={1}>{authorName}</Text>
          <Text style={[styles.rowSub, { color: colors.textSecondary }]} numberOfLines={2}>{item.content || '📷 Фото'}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderChat = ({ item }: { item: (typeof chats)[0] }) => {
    const name = item.name || item.other_user?.username || item.other_user?.email || 'Чат';
    return (
      <TouchableOpacity
        style={[styles.row, { borderBottomColor: colors.border }]}
        onPress={() => openChat(item.id, name)}
        activeOpacity={0.75}
      >
        <View style={[styles.chatAvatar, { backgroundColor: getAvatarColor(name) + '33' }]}>
          <Text style={[styles.chatAvatarText, { color: getAvatarColor(name) }]}>{name[0]?.toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>{name}</Text>
          {item.last_message ? (
            <Text style={[styles.rowSub, { color: colors.textSecondary }]} numberOfLines={1}>{item.last_message}</Text>
          ) : null}
        </View>
        <MaterialIcons name="chevron-right" size={20} color={colors.textMuted} />
      </TouchableOpacity>
    );
  };

  const tabs: { key: SearchTab; label: string }[] = [
    { key: 'users', label: 'Люди' },
    { key: 'posts', label: 'Посты' },
    { key: 'chats', label: 'Чаты' },
  ];

  const activeData = activeTab === 'users' ? users : activeTab === 'posts' ? posts : filteredChats;
  const activeRender = activeTab === 'users' ? renderUser : activeTab === 'posts' ? renderPost : renderChat;

  return (
    <View style={[styles.root, { paddingTop: insets.top, backgroundColor: colors.bg }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>Поиск</Text>

      <View style={[styles.searchBar, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
        <MaterialIcons name="search" size={20} color={colors.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: colors.textPrimary }]}
          value={query}
          onChangeText={setQuery}
          placeholder="Найти людей, посты, чаты..."
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
        {loading ? <ActivityIndicator size="small" color={colors.primary} /> : null}
      </View>

      {/* Tabs */}
      <View style={[styles.tabs, { borderBottomColor: colors.border, backgroundColor: colors.bgCard }]}>
        {tabs.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, activeTab === t.key && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            onPress={() => setActiveTab(t.key)}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, { color: activeTab === t.key ? colors.primary : colors.textMuted }]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {!query.trim() && activeTab !== 'chats' ? (
        <View style={styles.center}>
          <MaterialIcons name="search" size={56} color={colors.textMuted} />
          <Text style={[styles.hint, { color: colors.textMuted }]}>Введите запрос для поиска</Text>
        </View>
      ) : activeData.length === 0 && !loading ? (
        <View style={styles.center}>
          <MaterialIcons name="search-off" size={48} color={colors.textMuted} />
          <Text style={[styles.hint, { color: colors.textMuted }]}>Ничего не найдено</Text>
        </View>
      ) : (
        <FlatList
          data={activeData as any[]}
          keyExtractor={(item: any) => item.id}
          renderItem={activeRender as any}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  title: { fontSize: 20, fontWeight: '800', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginBottom: 12,
    borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 15 },
  tabs: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText: { fontSize: 14, fontWeight: '600' },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    gap: 12, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowTitle: { fontSize: 15, fontWeight: '600' },
  rowSub: { fontSize: 13, marginTop: 1 },
  chatAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  chatAvatarText: { fontSize: 17, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  hint: { fontSize: 15 },
});
