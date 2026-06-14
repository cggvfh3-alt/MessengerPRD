/*
 * @Description: News Feed — posts, likes, comments, follow feed
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
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth, useAlert } from '@/template';
import { useTheme } from '@/contexts/ThemeContext';
import { useFeed, useRecommended, useComments } from '@/hooks/useFeed';
import { Post } from '@/services/posts';
import * as ImagePicker from 'expo-image-picker';

function formatPostTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'Только что';
  if (min < 60) return `${min} мин.`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} ч.`;
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' });
}

const AVATAR_COLORS = ['#2DA8FF', '#A371F7', '#00D4AA', '#D29922', '#F85149', '#3FB950'];

function getAvatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

function Avatar({ name, avatarUrl, size = 40 }: { name: string; avatarUrl?: string | null; size?: number }) {
  const col = getAvatarColor(name);
  if (avatarUrl) {
    return (
      <Image
        source={{ uri: avatarUrl }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        contentFit="cover"
        transition={200}
      />
    );
  }
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: col + '33', alignItems: 'center', justifyContent: 'center',
    }}>
      <Text style={{ fontSize: size * 0.4, fontWeight: '700', color: col }}>
        {name[0]?.toUpperCase() || '?'}
      </Text>
    </View>
  );
}

function CommentsModal({
  post,
  userId,
  visible,
  onClose,
  colors,
}: {
  post: Post;
  userId: string;
  visible: boolean;
  onClose: () => void;
  colors: any;
}) {
  const { comments, loading, loadComments, addNewComment, removeComment } = useComments(post.id, userId);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (visible) loadComments();
  }, [visible]);

  const handleSend = async () => {
    if (!text.trim()) return;
    setSending(true);
    await addNewComment(text.trim());
    setText('');
    setSending(false);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} onPress={onClose} />
        <View style={[commStyles.sheet, { backgroundColor: colors.bgCard }]}>
          <View style={commStyles.handle} />
          <Text style={[commStyles.title, { color: colors.textPrimary }]}>Комментарии</Text>
          {loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
          ) : comments.length === 0 ? (
            <Text style={[commStyles.empty, { color: colors.textMuted }]}>Нет комментариев</Text>
          ) : (
            <FlatList
              data={comments}
              keyExtractor={(c) => c.id}
              style={{ maxHeight: 360 }}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const name = item.author?.username || item.author?.email || '?';
                return (
                  <View style={commStyles.commentRow}>
                    <Avatar name={name} avatarUrl={item.author?.avatar_url} size={32} />
                    <View style={{ flex: 1 }}>
                      <Text style={[commStyles.commentAuthor, { color: colors.primary }]}>{name}</Text>
                      <Text style={[commStyles.commentText, { color: colors.textPrimary }]}>{item.content}</Text>
                    </View>
                    {item.author_id === userId ? (
                      <TouchableOpacity onPress={() => removeComment(item.id)} activeOpacity={0.7}>
                        <MaterialIcons name="delete-outline" size={18} color={colors.textMuted} />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                );
              }}
            />
          )}
          <View style={[commStyles.inputRow, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
            <TextInput
              style={[commStyles.input, { color: colors.textPrimary }]}
              value={text}
              onChangeText={setText}
              placeholder="Написать комментарий..."
              placeholderTextColor={colors.textMuted}
              multiline
            />
            <TouchableOpacity onPress={handleSend} disabled={!text.trim() || sending} activeOpacity={0.8}>
              {sending ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <MaterialIcons name="send" size={22} color={text.trim() ? colors.primary : colors.textMuted} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function PostCard({
  post,
  userId,
  colors,
  onLike,
  onDelete,
  onEdit,
}: {
  post: Post;
  userId: string;
  colors: any;
  onLike: (id: string, isLiked: boolean) => void;
  onDelete: (id: string) => void;
  onEdit: (post: Post) => void;
}) {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const router = useRouter();
  const authorName = post.author?.username || post.author?.email || '?';
  const isOwn = post.author_id === userId;

  const handleMore = () => {
    if (!isOwn) return;
    Alert.alert('Действия', '', [
      { text: 'Редактировать', onPress: () => onEdit(post) },
      { text: 'Удалить', style: 'destructive', onPress: () => onDelete(post.id) },
      { text: 'Отмена', style: 'cancel' },
    ]);
  };

  return (
    <View style={[postStyles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
      {/* Header */}
      <View style={postStyles.cardHeader}>
        <TouchableOpacity
          style={postStyles.authorRow}
          onPress={() => router.push(`/profile/${post.author_id}` as any)}
          activeOpacity={0.8}
        >
          <Avatar name={authorName} avatarUrl={post.author?.avatar_url} size={38} />
          <View>
            <Text style={[postStyles.authorName, { color: colors.textPrimary }]}>{authorName}</Text>
            <Text style={[postStyles.postTime, { color: colors.textMuted }]}>
              {formatPostTime(post.created_at)}
              {post.edited_at ? ' · изменено' : ''}
            </Text>
          </View>
        </TouchableOpacity>
        {isOwn ? (
          <TouchableOpacity onPress={handleMore} activeOpacity={0.7} style={{ padding: 4 }}>
            <MaterialIcons name="more-vert" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Content */}
      {post.content ? (
        <Text style={[postStyles.content, { color: colors.textPrimary }]}>{post.content}</Text>
      ) : null}

      {/* Image */}
      {post.image_url ? (
        <Image
          source={{ uri: post.image_url }}
          style={postStyles.postImage}
          contentFit="cover"
          transition={200}
        />
      ) : null}

      {/* Actions */}
      <View style={[postStyles.actions, { borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={postStyles.actionBtn}
          onPress={() => onLike(post.id, !!post.is_liked)}
          activeOpacity={0.8}
        >
          <MaterialIcons
            name={post.is_liked ? 'favorite' : 'favorite-border'}
            size={22}
            color={post.is_liked ? '#F85149' : colors.textMuted}
          />
          {(post.likes_count || 0) > 0 ? (
            <Text style={[postStyles.actionCount, { color: post.is_liked ? '#F85149' : colors.textMuted }]}>
              {post.likes_count}
            </Text>
          ) : null}
        </TouchableOpacity>

        <TouchableOpacity
          style={postStyles.actionBtn}
          onPress={() => setCommentsOpen(true)}
          activeOpacity={0.8}
        >
          <MaterialIcons name="chat-bubble-outline" size={21} color={colors.textMuted} />
          {(post.comments_count || 0) > 0 ? (
            <Text style={[postStyles.actionCount, { color: colors.textMuted }]}>{post.comments_count}</Text>
          ) : null}
        </TouchableOpacity>
      </View>

      <CommentsModal
        post={post}
        userId={userId}
        visible={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        colors={colors}
      />
    </View>
  );
}

function CreatePostModal({
  visible,
  onClose,
  onSubmit,
  colors,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (text: string, imageUri?: string, imageBase64?: string | null) => Promise<boolean>;
  colors: any;
}) {
  const [text, setText] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setImageBase64(result.assets[0].base64 || null);
    }
  };

  const handleSubmit = async () => {
    if (!text.trim() && !imageUri) return;
    setLoading(true);
    const ok = await onSubmit(text.trim(), imageUri || undefined, imageBase64);
    setLoading(false);
    if (ok) {
      setText('');
      setImageUri(null);
      setImageBase64(null);
      onClose();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={[createStyles.sheet, { backgroundColor: colors.bgCard }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={[createStyles.title, { color: colors.textPrimary }]}>Новый пост</Text>
              <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
                <MaterialIcons name="close" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={[createStyles.input, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.inputBg }]}
              value={text}
              onChangeText={setText}
              placeholder="Что у вас нового?"
              placeholderTextColor={colors.textMuted}
              multiline
              maxLength={2000}
              autoFocus
            />

            {imageUri ? (
              <View style={{ marginBottom: 12 }}>
                <Image source={{ uri: imageUri }} style={createStyles.previewImg} contentFit="cover" />
                <TouchableOpacity
                  style={createStyles.removeImg}
                  onPress={() => { setImageUri(null); setImageBase64(null); }}
                >
                  <MaterialIcons name="close" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            ) : null}

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <TouchableOpacity onPress={pickImage} activeOpacity={0.8} style={{ padding: 8 }}>
                <MaterialIcons name="add-photo-alternate" size={28} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[createStyles.submitBtn, { backgroundColor: (!text.trim() && !imageUri) ? colors.textMuted : colors.primary }]}
                onPress={handleSubmit}
                disabled={loading || (!text.trim() && !imageUri)}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={createStyles.submitText}>Опубликовать</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<'feed' | 'recommended'>('feed');
  const [createOpen, setCreateOpen] = useState(false);
  const [editPost, setEditPost] = useState<Post | null>(null);
  const [editText, setEditText] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  const feed = useFeed(user?.id || '');
  const recommended = useRecommended(user?.id || '');

  useEffect(() => {
    if (user?.id) {
      feed.loadFeed(true);
      recommended.load(true);
    }
  }, [user?.id]);

  const activePosts = activeTab === 'feed' ? feed.posts : recommended.posts;
  const activeLoading = activeTab === 'feed' ? feed.loading : recommended.loading;

  const handleLike = activeTab === 'feed' ? feed.likePost : recommended.likePost;

  const handleRefresh = () => {
    if (activeTab === 'feed') feed.loadFeed(true);
    else recommended.load(true);
  };

  const handleEndReached = () => {
    if (activeTab === 'feed') feed.loadFeed(false);
    else recommended.load(false);
  };

  const handleEdit = (post: Post) => {
    setEditPost(post);
    setEditText(post.content || '');
  };

  const handleSaveEdit = async () => {
    if (!editPost || !editText.trim()) return;
    setEditLoading(true);
    await feed.editPost(editPost.id, editText.trim());
    setEditLoading(false);
    setEditPost(null);
    setEditText('');
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top, backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Лента</Text>
        <TouchableOpacity
          style={[styles.createBtn, { backgroundColor: colors.primary }]}
          onPress={() => setCreateOpen(true)}
          activeOpacity={0.85}
        >
          <MaterialIcons name="add" size={20} color="#fff" />
          <Text style={styles.createBtnText}>Пост</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={[styles.tabs, { borderBottomColor: colors.border, backgroundColor: colors.bgCard }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'feed' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('feed')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, { color: activeTab === 'feed' ? colors.primary : colors.textMuted }]}>
            Подписки
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'recommended' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('recommended')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, { color: activeTab === 'recommended' ? colors.primary : colors.textMuted }]}>
            Рекомендации
          </Text>
        </TouchableOpacity>
      </View>

      {activeLoading && activePosts.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : activePosts.length === 0 ? (
        <View style={styles.center}>
          <MaterialIcons name="dynamic-feed" size={64} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Нет публикаций</Text>
          <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
            {activeTab === 'feed'
              ? 'Подпишитесь на пользователей, чтобы видеть их посты'
              : 'Будьте первым — опубликуйте пост!'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={activePosts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <PostCard
              post={item}
              userId={user?.id || ''}
              colors={colors}
              onLike={handleLike}
              onDelete={feed.removePost}
              onEdit={handleEdit}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={activeLoading}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.3}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
          ListFooterComponent={
            (activeTab === 'feed' ? feed.loadingMore : false) ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />
            ) : null
          }
        />
      )}

      <CreatePostModal
        visible={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={feed.createNewPost}
        colors={colors}
      />

      {/* Edit post modal */}
      <Modal visible={!!editPost} animationType="slide" transparent onRequestClose={() => setEditPost(null)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
            <View style={[createStyles.sheet, { backgroundColor: colors.bgCard }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
                <Text style={[createStyles.title, { color: colors.textPrimary }]}>Редактировать пост</Text>
                <TouchableOpacity onPress={() => setEditPost(null)}>
                  <MaterialIcons name="close" size={24} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
              <TextInput
                style={[createStyles.input, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.inputBg }]}
                value={editText}
                onChangeText={setEditText}
                multiline
                autoFocus
                maxLength={2000}
              />
              <View style={{ alignItems: 'flex-end' }}>
                <TouchableOpacity
                  style={[createStyles.submitBtn, { backgroundColor: colors.primary }]}
                  onPress={handleSaveEdit}
                  disabled={editLoading}
                >
                  {editLoading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={createStyles.submitText}>Сохранить</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 20, fontWeight: '800' },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  createBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: { fontSize: 14, fontWeight: '600' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 17, fontWeight: '700' },
  emptyDesc: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});

const postStyles = StyleSheet.create({
  card: {
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  authorName: { fontSize: 15, fontWeight: '700' },
  postTime: { fontSize: 12, marginTop: 1 },
  content: { fontSize: 15, lineHeight: 22, paddingHorizontal: 12, paddingBottom: 10 },
  postImage: { width: '100%', height: 260 },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    gap: 20,
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  actionCount: { fontSize: 13, fontWeight: '600' },
});

const commStyles = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    minHeight: 300,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#484F58',
    alignSelf: 'center', marginBottom: 16,
  },
  title: { fontSize: 17, fontWeight: '700', marginBottom: 16 },
  empty: { textAlign: 'center', marginTop: 24 },
  commentRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    gap: 10, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#30363D',
  },
  commentAuthor: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  commentText: { fontSize: 14, lineHeight: 20 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginTop: 12, paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 20, borderWidth: 1,
  },
  input: { flex: 1, fontSize: 14, maxHeight: 80 },
});

const createStyles = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: 36,
  },
  title: { fontSize: 18, fontWeight: '700' },
  input: {
    borderWidth: 1, borderRadius: 12,
    padding: 12, fontSize: 15, lineHeight: 22,
    minHeight: 100, marginBottom: 12,
    textAlignVertical: 'top',
  },
  previewImg: { width: '100%', height: 180, borderRadius: 12, marginBottom: 4 },
  removeImg: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12, padding: 4,
  },
  submitBtn: {
    paddingHorizontal: 20, paddingVertical: 12,
    borderRadius: 20, alignItems: 'center',
  },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
