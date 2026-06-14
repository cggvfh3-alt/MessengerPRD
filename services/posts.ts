// Posts (News Feed) service — data layer only
import { getSupabaseClient } from '@/template';

export interface Post {
  id: string;
  author_id: string;
  content: string | null;
  image_url: string | null;
  edited_at: string | null;
  created_at: string;
  author?: { username: string | null; email: string; avatar_url: string | null };
  likes_count?: number;
  comments_count?: number;
  is_liked?: boolean;
}

export interface PostComment {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  created_at: string;
  author?: { username: string | null; email: string; avatar_url: string | null };
}

const PAGE_SIZE = 15;

export async function fetchFeedPosts(
  userId: string,
  page: number = 0
): Promise<{ data: Post[]; error: string | null }> {
  const supabase = getSupabaseClient();
  try {
    // Get posts from followed users + own posts
    const { data: followingRows } = await supabase
      .from('followers')
      .select('following_id')
      .eq('follower_id', userId);

    const followingIds = (followingRows || []).map((r: { following_id: string }) => r.following_id);
    followingIds.push(userId);

    const { data: posts, error } = await supabase
      .from('posts')
      .select('*')
      .in('author_id', followingIds)
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (error) return { data: [], error: error.message };
    return { data: await enrichPosts(posts || [], userId), error: null };
  } catch (e: any) {
    return { data: [], error: e.message };
  }
}

export async function fetchRecommendedPosts(
  userId: string,
  page: number = 0
): Promise<{ data: Post[]; error: string | null }> {
  const supabase = getSupabaseClient();
  try {
    const { data: posts, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (error) return { data: [], error: error.message };
    return { data: await enrichPosts(posts || [], userId), error: null };
  } catch (e: any) {
    return { data: [], error: e.message };
  }
}

export async function fetchUserPosts(
  authorId: string,
  userId: string,
  page: number = 0
): Promise<{ data: Post[]; error: string | null }> {
  const supabase = getSupabaseClient();
  try {
    const { data: posts, error } = await supabase
      .from('posts')
      .select('*')
      .eq('author_id', authorId)
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (error) return { data: [], error: error.message };
    return { data: await enrichPosts(posts || [], userId), error: null };
  } catch (e: any) {
    return { data: [], error: e.message };
  }
}

async function enrichPosts(posts: Post[], currentUserId: string): Promise<Post[]> {
  const supabase = getSupabaseClient();
  const authorCache: Record<string, { username: string | null; email: string; avatar_url: string | null }> = {};
  const enriched: Post[] = [];

  for (const post of posts) {
    if (!authorCache[post.author_id]) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('username, email, avatar_url')
        .eq('id', post.author_id)
        .single();
      authorCache[post.author_id] = profile || { username: null, email: '', avatar_url: null };
    }

    const { count: likesCount } = await supabase
      .from('post_likes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', post.id);

    const { count: commentsCount } = await supabase
      .from('post_comments')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', post.id);

    const { data: myLike } = await supabase
      .from('post_likes')
      .select('id')
      .eq('post_id', post.id)
      .eq('user_id', currentUserId)
      .single();

    enriched.push({
      ...post,
      author: authorCache[post.author_id],
      likes_count: likesCount || 0,
      comments_count: commentsCount || 0,
      is_liked: !!myLike,
    });
  }

  return enriched;
}

export async function createPost(
  authorId: string,
  content: string,
  imageUrl?: string
): Promise<{ data: Post | null; error: string | null }> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('posts')
    .insert({ author_id: authorId, content: content || null, image_url: imageUrl || null })
    .select()
    .single();

  return { data: data || null, error: error?.message || null };
}

export async function updatePost(
  postId: string,
  content: string
): Promise<{ error: string | null }> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('posts')
    .update({ content, edited_at: new Date().toISOString() })
    .eq('id', postId);
  return { error: error?.message || null };
}

export async function deletePost(postId: string): Promise<{ error: string | null }> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('posts').delete().eq('id', postId);
  return { error: error?.message || null };
}

export async function toggleLike(
  postId: string,
  userId: string,
  isLiked: boolean
): Promise<{ error: string | null }> {
  const supabase = getSupabaseClient();
  if (isLiked) {
    const { error } = await supabase
      .from('post_likes')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', userId);
    return { error: error?.message || null };
  } else {
    const { error } = await supabase
      .from('post_likes')
      .insert({ post_id: postId, user_id: userId });
    return { error: error?.message || null };
  }
}

export async function fetchComments(
  postId: string
): Promise<{ data: PostComment[]; error: string | null }> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('post_comments')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  if (error) return { data: [], error: error.message };

  const enriched: PostComment[] = [];
  const cache: Record<string, { username: string | null; email: string; avatar_url: string | null }> = {};

  for (const c of data || []) {
    if (!cache[c.author_id]) {
      const { data: p } = await supabase
        .from('user_profiles')
        .select('username, email, avatar_url')
        .eq('id', c.author_id)
        .single();
      cache[c.author_id] = p || { username: null, email: '', avatar_url: null };
    }
    enriched.push({ ...c, author: cache[c.author_id] });
  }

  return { data: enriched, error: null };
}

export async function addComment(
  postId: string,
  authorId: string,
  content: string
): Promise<{ data: PostComment | null; error: string | null }> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('post_comments')
    .insert({ post_id: postId, author_id: authorId, content })
    .select()
    .single();
  return { data: data || null, error: error?.message || null };
}

export async function deleteComment(commentId: string): Promise<{ error: string | null }> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('post_comments').delete().eq('id', commentId);
  return { error: error?.message || null };
}

export async function searchPosts(
  query: string,
  userId: string
): Promise<{ data: Post[]; error: string | null }> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .ilike('content', `%${query}%`)
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) return { data: [], error: error.message };
  return { data: await enrichPosts(data || [], userId), error: null };
}
