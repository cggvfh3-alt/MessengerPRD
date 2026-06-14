/*
 * @Description: My Profile — posts, followers, following, settings link
 */
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, FlatList,
} from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/template';
import { useTheme } from '@/contexts/ThemeContext';
import { fetchUserProfile, UserProfileFull, fetchFollowers, fetchFollowing } from '@/services/social';
import { fetchUserPosts, Post } from '@/services/posts';
import { Image as ExpoImage } from 'expo-image';

const AVATAR_COLORS = ['#2DA8FF', '#A371F7', '#00D4AA', '#D29922', '#F85149', '#3FB950'];
function getAvatarColor(name: string) {
  return AVATAR_COLORS[(name.charCodeAt(0) || 0) % AVATAR_COLORS.length];
}

function Avatar({ name, avatarUrl, size = 80 }: { name: string; avatarUrl?: string | null; size?: number }) {
  const col = getAvatarColor(name);
  if (avatarUrl) {
    return <ExpoImage source={{ uri: avatarUrl }} style={{ width: size, height: size, borderRadius: size / 2 }} contentFit="cover" transition={200} />;
  }
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: col + '33', borderWidth: 3, borderColor: col + '66', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: size * 0.38, fontWeight: '700', color: col }}>{(name[0] || '?').toUpperCase()}</Text>
    </View>
  );
}

type ProfileTab = 'posts' | 'followers' | 'following';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useTheme();

  const [profile, setProfile] = useState<UserProfileFull | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [followers, setFollowers] = useState<UserProfileFull[]>([]);
  const [following, setFollowing] = useState<UserProfileFull[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ProfileTab>('posts');

  const displayName = profile?.username || profile?.email || user?.username || user?.email || '?';

  const loadData = async () => {
    if (!user?.id) return;
    setLoading(true);
    const [profileResult, postsResult, followersResult, followingResult] = await Promise.all([
      fetchUserProfile(user.id),
      fetchUserPosts(user.id, user.id),
      fetchFollowers(user.id),
      fetchFollowing(user.id),
    ]);
    if (profileResult.data) setProfile(profileResult.data);
    setPosts(postsResult.data);
    setFollowers(followersResult.data);
    setFollowing(followingResult.data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [user?.id]);

  const renderPost = ({ item }: { item: Post }) => (
    <View style={{ width: '33.33%', padding: 1 }}>
      {item.image_url ? (
        <ExpoImage source={{ uri: item.image_url }} style={{ width: '100%', aspectRatio: 1 }} contentFit="cover" />
      ) : (
        <View style={{ width: '100%', aspectRatio: 1, backgroundColor: colors.bgCard, alignItems: 'center', justifyContent: 'center', padding: 8 }}>
          <Text style={{ fontSize: 12, color: colors.textSecondary, textAlign: 'center' }} numberOfLines={4}>{item.content}</Text>
        </View>
      )}
    </View>
  );

  const renderUser = ({ item }: { item: UserProfileFull }) => {
    const name = item.username || item.email;
    return (
      <TouchableOpacity
        style={[listStyles.row, { borderBottomColor: colors.border }]}
        onPress={() => router.push(`/profile/${item.id}` as any)}
        activeOpacity={0.75}
      >
        <Avatar name={name} avatarUrl={item.avatar_url} size={40} />
        <View style={{ flex: 1 }}>
          <Text style={[listStyles.name, { color: colors.textPrimary }]}>{name}</Text>
          <Text style={[listStyles.email, { color: colors.textSecondary }]}>{item.email}</Text>
        </View>
        <MaterialIcons name="chevron-right" size={18} color={colors.textMuted} />
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.root, { paddingTop: insets.top, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top, backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Профиль</Text>
        <TouchableOpacity onPress={() => router.push('/settings' as any)} activeOpacity={0.75}>
          <MaterialIcons name="settings" size={22} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} tintColor={colors.primary} />}
      >
        {/* Profile info */}
        <View style={[styles.profileSection, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <Avatar name={displayName} avatarUrl={profile?.avatar_url} size={80} />
          <Text style={[styles.profileName, { color: colors.textPrimary }]}>{displayName}</Text>
          {profile?.bio ? (
            <Text style={[styles.bio, { color: colors.textSecondary }]}>{profile.bio}</Text>
          ) : null}
          <Text style={[styles.email, { color: colors.textMuted }]}>{user?.email}</Text>

          {/* Stats */}
          <View style={styles.statsRow}>
            <TouchableOpacity style={styles.stat} onPress={() => setActiveTab('posts')} activeOpacity={0.8}>
              <Text style={[styles.statNum, { color: colors.textPrimary }]}>{posts.length}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Постов</Text>
            </TouchableOpacity>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <TouchableOpacity style={styles.stat} onPress={() => setActiveTab('followers')} activeOpacity={0.8}>
              <Text style={[styles.statNum, { color: colors.textPrimary }]}>{profile?.followers_count || 0}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Подписчики</Text>
            </TouchableOpacity>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <TouchableOpacity style={styles.stat} onPress={() => setActiveTab('following')} activeOpacity={0.8}>
              <Text style={[styles.statNum, { color: colors.textPrimary }]}>{profile?.following_count || 0}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Подписки</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Content tabs */}
        <View style={[styles.tabs, { borderBottomColor: colors.border, backgroundColor: colors.bgCard }]}>
          {(['posts', 'followers', 'following'] as ProfileTab[]).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.tab, activeTab === t && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
              onPress={() => setActiveTab(t)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, { color: activeTab === t ? colors.primary : colors.textMuted }]}>
                {t === 'posts' ? 'Посты' : t === 'followers' ? 'Подписчики' : 'Подписки'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === 'posts' ? (
          posts.length === 0 ? (
            <View style={styles.emptyWrap}>
              <MaterialIcons name="photo-library" size={48} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>Нет публикаций</Text>
            </View>
          ) : (
            <FlatList
              data={posts}
              keyExtractor={(p) => p.id}
              renderItem={renderPost}
              numColumns={3}
              scrollEnabled={false}
              style={{ marginTop: 2 }}
            />
          )
        ) : activeTab === 'followers' ? (
          followers.length === 0 ? (
            <View style={styles.emptyWrap}>
              <MaterialIcons name="people-outline" size={48} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>Нет подписчиков</Text>
            </View>
          ) : (
            <FlatList
              data={followers}
              keyExtractor={(u) => u.id}
              renderItem={renderUser}
              scrollEnabled={false}
            />
          )
        ) : (
          following.length === 0 ? (
            <View style={styles.emptyWrap}>
              <MaterialIcons name="person-add-alt-1" size={48} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>Вы ни на кого не подписаны</Text>
            </View>
          ) : (
            <FlatList
              data={following}
              keyExtractor={(u) => u.id}
              renderItem={renderUser}
              scrollEnabled={false}
            />
          )
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 20, fontWeight: '800' },
  profileSection: { alignItems: 'center', padding: 24, borderBottomWidth: 1, gap: 6 },
  profileName: { fontSize: 20, fontWeight: '800', marginTop: 8 },
  bio: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  email: { fontSize: 13 },
  statsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, width: '100%' },
  stat: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 12, marginTop: 2 },
  statDivider: { width: 1, height: 30 },
  tabs: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText: { fontSize: 14, fontWeight: '600' },
  emptyWrap: { alignItems: 'center', paddingTop: 48, gap: 10 },
  emptyText: { fontSize: 15 },
});

const listStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  name: { fontSize: 15, fontWeight: '600' },
  email: { fontSize: 13, marginTop: 1 },
});
