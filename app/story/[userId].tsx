/*
 * @Description: Story viewer — full-screen stories with auto-advance
 */
import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Dimensions,
  ActivityIndicator, FlatList, Modal, Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/template';
import { useTheme } from '@/contexts/ThemeContext';
import { getSupabaseClient } from '@/template';
import * as ImagePicker from 'expo-image-picker';
import { uploadPostImage } from '@/services/storage';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const STORY_DURATION = 5000;

interface Story {
  id: string;
  author_id: string;
  media_url: string;
  media_type: string;
  expires_at: string;
  created_at: string;
  author?: { username: string | null; email: string; avatar_url: string | null };
  views_count?: number;
}

async function fetchStoriesForUser(userId: string): Promise<Story[]> {
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from('stories')
    .select('*')
    .eq('author_id', userId)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: true });

  if (!data) return [];
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('username, email, avatar_url')
    .eq('id', userId)
    .single();

  const { count: viewsCount } = await supabase
    .from('story_views')
    .select('*', { count: 'exact', head: true })
    .in('story_id', data.map((s: Story) => s.id));

  return data.map((s: Story) => ({ ...s, author: profile || undefined, views_count: viewsCount || 0 }));
}

async function markStoryViewed(storyId: string, viewerId: string) {
  const supabase = getSupabaseClient();
  await supabase
    .from('story_views')
    .upsert({ story_id: storyId, viewer_id: viewerId }, { onConflict: 'story_id,viewer_id' });
}

async function deleteStory(storyId: string) {
  const supabase = getSupabaseClient();
  await supabase.from('stories').delete().eq('id', storyId);
}

export default function StoryViewer() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [stories, setStories] = useState<Story[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!userId) return;
    fetchStoriesForUser(userId).then((data) => {
      setStories(data);
      setLoading(false);
    });
  }, [userId]);

  useEffect(() => {
    if (!stories.length) return;
    const story = stories[currentIdx];
    if (story && user?.id) markStoryViewed(story.id, user.id);

    setProgress(0);
    if (progressRef.current) clearInterval(progressRef.current);
    if (timerRef.current) clearTimeout(timerRef.current);

    progressRef.current = setInterval(() => {
      setProgress((p) => Math.min(p + (100 / (STORY_DURATION / 50)), 100));
    }, 50);

    timerRef.current = setTimeout(() => {
      if (currentIdx < stories.length - 1) {
        setCurrentIdx((i) => i + 1);
      } else {
        router.back();
      }
    }, STORY_DURATION);

    return () => {
      if (progressRef.current) clearInterval(progressRef.current);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentIdx, stories]);

  const handleDelete = async () => {
    const story = stories[currentIdx];
    if (!story || story.author_id !== user?.id) return;
    Alert.alert('Удалить историю?', '', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Удалить', style: 'destructive', onPress: async () => {
        await deleteStory(story.id);
        router.back();
      }},
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.root, { backgroundColor: '#000' }]}>
        <ActivityIndicator color="#fff" size="large" />
      </View>
    );
  }

  if (!stories.length) {
    return (
      <View style={[styles.root, { backgroundColor: '#000' }]}>
        <Text style={{ color: '#fff', fontSize: 16, textAlign: 'center' }}>Нет историй</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ position: 'absolute', top: insets.top + 16, left: 16 }}>
          <MaterialIcons name="close" size={28} color="#fff" />
        </TouchableOpacity>
      </View>
    );
  }

  const story = stories[currentIdx];
  const authorName = story.author?.username || story.author?.email || '?';

  return (
    <View style={[styles.root, { backgroundColor: '#000' }]}>
      <Image
        source={{ uri: story.media_url }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        transition={200}
      />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.2)' }]} />

      {/* Progress bars */}
      <View style={[styles.progressContainer, { paddingTop: insets.top + 8 }]}>
        {stories.map((_, idx) => (
          <View key={idx} style={[styles.progressBar, { backgroundColor: 'rgba(255,255,255,0.3)' }]}>
            <View style={[styles.progressFill, {
              width: idx < currentIdx ? '100%' : idx === currentIdx ? `${progress}%` : '0%'
            }]} />
          </View>
        ))}
      </View>

      {/* Header */}
      <View style={[styles.storyHeader, { marginTop: insets.top + 24 }]}>
        <View style={styles.authorRow}>
          <View style={styles.authorAvatar}>
            <Text style={styles.authorAvatarText}>{authorName[0]?.toUpperCase()}</Text>
          </View>
          <View>
            <Text style={styles.authorName}>{authorName}</Text>
            <Text style={styles.storyTime}>
              {new Date(story.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {story.author_id === user?.id ? (
            <>
              <TouchableOpacity onPress={handleDelete}>
                <MaterialIcons name="delete" size={24} color="#fff" />
              </TouchableOpacity>
              {story.views_count ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <MaterialIcons name="visibility" size={18} color="rgba(255,255,255,0.7)" />
                  <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>{story.views_count}</Text>
                </View>
              ) : null}
            </>
          ) : null}
          <TouchableOpacity onPress={() => router.back()}>
            <MaterialIcons name="close" size={28} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Navigation zones */}
      <View style={styles.navZones}>
        <TouchableOpacity style={styles.navPrev} onPress={() => setCurrentIdx((i) => Math.max(0, i - 1))} />
        <TouchableOpacity style={styles.navNext} onPress={() => {
          if (currentIdx < stories.length - 1) setCurrentIdx((i) => i + 1);
          else router.back();
        }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  progressContainer: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', paddingHorizontal: 8, gap: 4, zIndex: 10,
  },
  progressBar: { flex: 1, height: 2, borderRadius: 1, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#fff', borderRadius: 1 },
  storyHeader: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, zIndex: 10,
  },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  authorAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  authorAvatarText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  authorName: { fontSize: 15, fontWeight: '700', color: '#fff' },
  storyTime: { fontSize: 11, color: 'rgba(255,255,255,0.7)' },
  navZones: { ...StyleSheet.absoluteFillObject, flexDirection: 'row', zIndex: 5 },
  navPrev: { flex: 1 },
  navNext: { flex: 1 },
});
