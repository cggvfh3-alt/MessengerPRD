// Feed state management hook
import { useState, useCallback } from 'react';
import {
  fetchFeedPosts,
  fetchRecommendedPosts,
  fetchUserPosts,
  createPost,
  updatePost,
  deletePost,
  toggleLike,
  fetchComments,
  addComment,
  deleteComment,
  searchPosts,
  Post,
  PostComment,
} from '@/services/posts';
import { pickAndUploadImage } from '@/services/storage';

export function useFeed(userId: string) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const loadFeed = useCallback(async (reset = true) => {
    if (!userId) return;
    if (reset) {
      setLoading(true);
      const { data } = await fetchFeedPosts(userId, 0);
      setPosts(data);
      setPage(1);
      setHasMore(data.length === 15);
      setLoading(false);
    } else {
      if (loadingMore || !hasMore) return;
      setLoadingMore(true);
      const { data } = await fetchFeedPosts(userId, page);
      setPosts((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        return [...prev, ...data.filter((p) => !existingIds.has(p.id))];
      });
      setPage((p) => p + 1);
      setHasMore(data.length === 15);
      setLoadingMore(false);
    }
  }, [userId, page, loadingMore, hasMore]);

  const createNewPost = useCallback(async (content: string, imageUri?: string, imageBase64?: string | null): Promise<boolean> => {
    let imageUrl: string | undefined;

    if (imageUri) {
      const { url, error } = await pickImageForPost(userId, imageUri, imageBase64);
      if (error) return false;
      imageUrl = url || undefined;
    }

    const { error } = await createPost(userId, content, imageUrl);
    if (!error) await loadFeed(true);
    return !error;
  }, [userId, loadFeed]);

  const editPost = useCallback(async (postId: string, content: string): Promise<boolean> => {
    const { error } = await updatePost(postId, content);
    if (!error) {
      setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, content, edited_at: new Date().toISOString() } : p));
    }
    return !error;
  }, []);

  const removePost = useCallback(async (postId: string) => {
    await deletePost(postId);
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  }, []);

  const likePost = useCallback(async (postId: string, isLiked: boolean) => {
    // Optimistic update
    setPosts((prev) => prev.map((p) => p.id === postId ? {
      ...p,
      is_liked: !isLiked,
      likes_count: (p.likes_count || 0) + (isLiked ? -1 : 1),
    } : p));
    await toggleLike(postId, userId, isLiked);
  }, [userId]);

  return {
    posts, loading, loadingMore, hasMore,
    loadFeed, createNewPost, editPost, removePost, likePost,
  };
}

async function pickImageForPost(
  userId: string,
  uri: string,
  base64?: string | null
): Promise<{ url: string | null; error: string | null }> {
  const { uploadPostImage } = await import('@/services/storage');
  return uploadPostImage(userId, uri, base64);
}

export function useRecommended(userId: string) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const load = useCallback(async (reset = true) => {
    if (!userId) return;
    if (reset) {
      setLoading(true);
      const { data } = await fetchRecommendedPosts(userId, 0);
      setPosts(data);
      setPage(1);
      setHasMore(data.length === 15);
      setLoading(false);
    } else {
      const { data } = await fetchRecommendedPosts(userId, page);
      setPosts((prev) => {
        const ids = new Set(prev.map((p) => p.id));
        return [...prev, ...data.filter((p) => !ids.has(p.id))];
      });
      setPage((p) => p + 1);
      setHasMore(data.length === 15);
    }
  }, [userId, page]);

  const likePost = useCallback(async (postId: string, isLiked: boolean) => {
    setPosts((prev) => prev.map((p) => p.id === postId ? {
      ...p, is_liked: !isLiked, likes_count: (p.likes_count || 0) + (isLiked ? -1 : 1),
    } : p));
    await toggleLike(postId, userId, isLiked);
  }, [userId]);

  return { posts, loading, hasMore, load, likePost };
}

export function useComments(postId: string, userId: string) {
  const [comments, setComments] = useState<PostComment[]>([]);
  const [loading, setLoading] = useState(false);

  const loadComments = useCallback(async () => {
    setLoading(true);
    const { data } = await fetchComments(postId);
    setComments(data);
    setLoading(false);
  }, [postId]);

  const addNewComment = useCallback(async (content: string): Promise<boolean> => {
    const { data, error } = await addComment(postId, userId, content);
    if (!error && data) {
      setComments((prev) => [...prev, { ...data, author: { username: null, email: '', avatar_url: null } }]);
      return true;
    }
    return false;
  }, [postId, userId]);

  const removeComment = useCallback(async (commentId: string) => {
    await deleteComment(commentId);
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  }, []);

  return { comments, loading, loadComments, addNewComment, removeComment };
}
