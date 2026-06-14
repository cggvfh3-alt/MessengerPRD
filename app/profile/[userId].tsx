/*
 * @Description: User profile view — follow, posts, stats
 */
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, FlatList,
} from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/template';
import { useTheme } from '@/contexts/ThemeContext';
import { fetchUserProfile, toggleFollow, UserProfileFull, formatLastSeen } from '@/services/social';
import { fetchUserPosts, Post, toggleLike } from '@/services/posts';
import { createOrGetDirectChat } from '@/services/chats';

const AVATAR_COLORS = ['#2DA8FF', '#A371F7', '#00D4AA', '#D29922', '#F85149', '#3FB950'];
function getAvatarColor(name: string) {
  return AVATAR_COLORS[(name.charCodeAt(0) || 0) % AVATAR_COLORS.length];
}

function Avatar({ name, avatarUrl, size = 80 }: { name: string; avatarUrl?: string | null; size?: number }) {
  const col = getAvatarColor(name);
  if (avatarUrl) {
    return <Image source={{ uri: avatarUrl }} style={{ width: size, height: size, borderRadius: size / 2 }} contentFit="cover" transition={200} />;
  }
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: col + '33', borderWidth: 3, borderColor: col + '66', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: size * 0.38, fontWeight: '700', color: col }}>{(name[0] || '?').toUpperCase()}</Text>
    </View>
  );
}

export default function UserProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { user } = useAuth();
  const { colors } = useTheme();

  const [profile, setProfile] = useState<UserProfileFull | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [messageLoading, setMessageLoading] = useState(false);

  const isOwnProfile = userId === user?.id;

  const loadData = async () => {
    if (!userId || !user?.id) return;
    setLoading(true);
    const [profileResult, postsResult] = await Promise.all([
      fetchUserProfile(userId, user.id),
      fetchUserPosts(userId, user.id),
    ]);
    if (profileResult.data) setProfile(profileResult.data);
    setPosts(postsResult.data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [userId, user?.id]);

  const handleFollow = async () => {
    if (!profile || !user?.id) return;
    setFollowLoading(true);
    await toggleFollow(user.id, userId, profile.is_following || false);
    setProfile((prev) => prev ? {
      ...prev,
      is_following: !prev.is_following,
      followers_count: (prev.followers_count || 0) + (prev.is_following ? -1 : 1),
    } : prev);
    setFollowLoading(false);
  };

  const handleMessage = async () => {
    if (!user?.id) return;
    setMessageLoading(true);
    const { data: chat } = await createOrGetDirectChat(user.id, userId);
    setMessageLoading(false);
    if (chat) {
      const name = profile?.username || profile?.email || 'Чат';
      router.push({ pathname: '/chat/[id]', params: { id: chat.id, name } } as any);
    }
  };

  const displayName = profile?.username || profile?.email || '?';

  if (loading) {
    return (
      <View style={[styles.root, { paddingTop: insets.top, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top, backgroundColor: colors.bg }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }} activeOpacity={0.75}>
          <MaterialIcons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{displayName}</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile card */}
        <View style={[styles.profileSection, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <Avatar name={displayName} avatarUrl={profile?.avatar_url} size={80} />
          <Text style={[styles.name, { color: colors.textPrimary }]}>{displayName}</Text>
          <Text style={[styles.onlineStatus, {
            color: profile?.is_online ? colors.success : colors.textMuted
          }]}>
            {formatLastSeen(profile?.last_seen_at || null, profile?.is_online || false)}
          </Text>
          {profile?.bio ? <Text style={[styles.bio, { color: colors.textSecondary }]}>{profile.bio}</Text> : null}

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={[styles.statNum, { color: colors.textPrimary }]}>{posts.length}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Постов</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.stat}>
              <Text style={[styles.statNum, { color: colors.textPrimary }]}>{profile?.followers_count || 0}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Подписчики</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.stat}>
              <Text style={[styles.statNum, { color: colors.textPrimary }]}>{profile?.following_count || 0}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Подписки</Text>
            </View>
          </View>

          {!isOwnProfile ? (
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.followBtn, {
                  backgroundColor: profile?.is_following ? colors.bgSection : colors.primary,
                  borderColor: profile?.is_following ? colors.border : colors.primary,
                }]}
                onPress={handleFollow}
                disabled={followLoading}
                activeOpacity={0.85}
              >
                {followLoading ? (
                  <ActivityIndicator size="small" color={profile?.is_following ? colors.textPrimary : '#fff'} />
                ) : (
                  <Text style={[styles.followBtnText, { color: profile?.is_following ? colors.textPrimary : '#fff' }]}>
                    {profile?.is_following ? 'Отписаться' : 'Подписаться'}
                  </Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.msgBtn, { backgroundColor: colors.bgSection, borderColor: colors.border }]}
                onPress={handleMessage}
                disabled={messageLoading}
                activeOpacity={0.85}
              >
                {messageLoading ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <MaterialIcons name="chat" size={18} color={colors.primary} />
                )}
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        {/* Posts grid */}
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>ПУБЛИКАЦИИ</Text>
        {posts.length === 0 ? (
          <View style={styles.emptyWrap}>
            <MaterialIcons name="photo-library" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>Нет публикаций</Text>
          </View>
        ) : (
          <FlatList
            data={posts}
            keyExtractor={(p) => p.id}
            numColumns={3}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <View style={{ width: '33.33%', padding: 1 }}>
                {item.image_url ? (
                  <Image source={{ uri: item.image_url }} style={{ width: '100%', aspectRatio: 1 }} contentFit="cover" />
                ) : (
                  <View style={{ width: '100%', aspectRatio: 1, backgroundColor: colors.bgCard, alignItems: 'center', justifyContent: 'center', padding: 6 }}>
                    <Text style={{ fontSize: 11, color: colors.textSecondary, textAlign: 'center' }} numberOfLines={4}>{item.content}</Text>
                  </View>
                )}
              </View>
            )}
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  profileSection: { alignItems: 'center', padding: 24, borderBottomWidth: 1, gap: 6 },
  name: { fontSize: 20, fontWeight: '800', marginTop: 8 },
  onlineStatus: { fontSize: 13, fontWeight: '500' },
  bio: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  statsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, width: '100%' },
  stat: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 12, marginTop: 2 },
  statDivider: { width: 1, height: 30 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  followBtn: { flex: 1, paddingVertical: 11, borderRadius: 20, alignItems: 'center', borderWidth: 1 },
  followBtnText: { fontSize: 15, fontWeight: '700' },
  msgBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  sectionTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 1, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  emptyWrap: { alignItems: 'center', paddingTop: 32, gap: 10 },
  emptyText: { fontSize: 15 },
});
