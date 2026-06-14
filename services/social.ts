// Social service — follow/unfollow, online status, user profiles
import { getSupabaseClient } from '@/template';

export interface UserProfileFull {
  id: string;
  username: string | null;
  email: string;
  bio: string | null;
  avatar_url: string | null;
  last_seen_at: string | null;
  is_online: boolean;
  followers_count?: number;
  following_count?: number;
  posts_count?: number;
  is_following?: boolean;
}

export async function fetchUserProfile(
  userId: string,
  currentUserId?: string
): Promise<{ data: UserProfileFull | null; error: string | null }> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) return { data: null, error: error.message };

  const { count: followersCount } = await supabase
    .from('followers')
    .select('*', { count: 'exact', head: true })
    .eq('following_id', userId);

  const { count: followingCount } = await supabase
    .from('followers')
    .select('*', { count: 'exact', head: true })
    .eq('follower_id', userId);

  const { count: postsCount } = await supabase
    .from('posts')
    .select('*', { count: 'exact', head: true })
    .eq('author_id', userId);

  let isFollowing = false;
  if (currentUserId && currentUserId !== userId) {
    const { data: followRow } = await supabase
      .from('followers')
      .select('id')
      .eq('follower_id', currentUserId)
      .eq('following_id', userId)
      .single();
    isFollowing = !!followRow;
  }

  return {
    data: {
      ...data,
      followers_count: followersCount || 0,
      following_count: followingCount || 0,
      posts_count: postsCount || 0,
      is_following: isFollowing,
    },
    error: null,
  };
}

export async function fetchFollowers(
  userId: string
): Promise<{ data: UserProfileFull[]; error: string | null }> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('followers')
    .select('follower_id')
    .eq('following_id', userId);

  if (error) return { data: [], error: error.message };

  const ids = (data || []).map((r: { follower_id: string }) => r.follower_id);
  if (!ids.length) return { data: [], error: null };

  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('*')
    .in('id', ids);

  return { data: profiles || [], error: null };
}

export async function fetchFollowing(
  userId: string
): Promise<{ data: UserProfileFull[]; error: string | null }> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('followers')
    .select('following_id')
    .eq('follower_id', userId);

  if (error) return { data: [], error: error.message };

  const ids = (data || []).map((r: { following_id: string }) => r.following_id);
  if (!ids.length) return { data: [], error: null };

  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('*')
    .in('id', ids);

  return { data: profiles || [], error: null };
}

export async function toggleFollow(
  followerId: string,
  followingId: string,
  isFollowing: boolean
): Promise<{ error: string | null }> {
  const supabase = getSupabaseClient();
  if (isFollowing) {
    const { error } = await supabase
      .from('followers')
      .delete()
      .eq('follower_id', followerId)
      .eq('following_id', followingId);
    return { error: error?.message || null };
  } else {
    const { error } = await supabase
      .from('followers')
      .insert({ follower_id: followerId, following_id: followingId });
    return { error: error?.message || null };
  }
}

export async function updateOnlineStatus(userId: string, isOnline: boolean): Promise<void> {
  const supabase = getSupabaseClient();
  await supabase
    .from('user_profiles')
    .update({ is_online: isOnline, last_seen_at: new Date().toISOString() })
    .eq('id', userId);
}

export async function getOnlineStatus(userId: string): Promise<{
  is_online: boolean;
  last_seen_at: string | null;
}> {
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from('user_profiles')
    .select('is_online, last_seen_at')
    .eq('id', userId)
    .single();
  return data || { is_online: false, last_seen_at: null };
}

export function formatLastSeen(lastSeenAt: string | null, isOnline: boolean): string {
  if (isOnline) return 'В сети';
  if (!lastSeenAt) return 'Не в сети';

  const now = new Date();
  const last = new Date(lastSeenAt);
  const diffMs = now.getTime() - last.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'Только что';
  if (diffMin < 5) return 'Был недавно';
  if (diffMin < 60) return `Был ${diffMin} мин. назад`;
  if (diffHours < 24) return `Был ${diffHours} ч. назад`;
  if (diffDays === 1) return 'Был вчера';
  return `Был ${last.toLocaleDateString('ru-RU')}`;
}

export async function updateUserProfile(
  userId: string,
  updates: { username?: string; bio?: string; avatar_url?: string }
): Promise<{ error: string | null }> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('user_profiles')
    .update(updates)
    .eq('id', userId);
  return { error: error?.message || null };
}

export async function searchUsersGlobal(
  query: string,
  currentUserId: string
): Promise<{ data: UserProfileFull[]; error: string | null }> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .neq('id', currentUserId)
    .or(`username.ilike.%${query}%,email.ilike.%${query}%`)
    .limit(20);

  return { data: data || [], error: error?.message || null };
}
