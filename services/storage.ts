// Storage service for uploading media
import { getSupabaseClient } from '@/template';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

export async function pickAndUploadImage(userId: string): Promise<{ url: string | null; error: string | null }> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    return { url: null, error: 'Нет доступа к галерее. Разрешите доступ в настройках.' };
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.8,
    base64: true,
    allowsEditing: false,
  });

  if (result.canceled || !result.assets?.[0]) return { url: null, error: null };

  return uploadAsset(result.assets[0], userId, 'chat-media');
}

export async function takePhotoAndUpload(userId: string): Promise<{ url: string | null; error: string | null }> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    return { url: null, error: 'Нет доступа к камере. Разрешите доступ в настройках.' };
  }

  const result = await ImagePicker.launchCameraAsync({ quality: 0.8, base64: true });
  if (result.canceled || !result.assets?.[0]) return { url: null, error: null };

  return uploadAsset(result.assets[0], userId, 'chat-media');
}

async function uploadAsset(
  asset: { uri: string; base64?: string | null },
  userId: string,
  bucket: string
): Promise<{ url: string | null; error: string | null }> {
  const supabase = getSupabaseClient();
  const ext = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
  const mimeType = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : 'image/jpeg';
  const fileName = `${userId}/${Date.now()}.${ext}`;

  try {
    if (Platform.OS === 'web') {
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, blob, { contentType: mimeType, upsert: true });
      if (uploadError) return { url: null, error: uploadError.message };
    } else {
      if (!asset.base64) return { url: null, error: 'Не удалось получить данные изображения' };
      const byteArray = Uint8Array.from(atob(asset.base64), (c) => c.charCodeAt(0));
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, byteArray, { contentType: mimeType, upsert: true });
      if (uploadError) return { url: null, error: uploadError.message };
    }

    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fileName);
    return { url: urlData.publicUrl, error: null };
  } catch (e: any) {
    return { url: null, error: e.message };
  }
}

export async function uploadVoice(
  userId: string,
  localUri: string
): Promise<{ url: string | null; error: string | null }> {
  const supabase = getSupabaseClient();
  const fileName = `${userId}/voice_${Date.now()}.m4a`;

  try {
    if (Platform.OS === 'web') {
      const response = await fetch(localUri);
      const blob = await response.blob();
      const { error: uploadError } = await supabase.storage
        .from('chat-media')
        .upload(fileName, blob, { contentType: 'audio/m4a', upsert: true });
      if (uploadError) return { url: null, error: uploadError.message };
    } else {
      const response = await fetch(localUri);
      const blob = await response.blob();
      const arrBuf = await blob.arrayBuffer();
      const byteArray = new Uint8Array(arrBuf);
      const { error: uploadError } = await supabase.storage
        .from('chat-media')
        .upload(fileName, byteArray, { contentType: 'audio/m4a', upsert: true });
      if (uploadError) return { url: null, error: uploadError.message };
    }

    const { data: urlData } = supabase.storage.from('chat-media').getPublicUrl(fileName);
    return { url: urlData.publicUrl, error: null };
  } catch (e: any) {
    return { url: null, error: e.message };
  }
}

export async function uploadPostImage(
  userId: string,
  uri: string,
  base64?: string | null
): Promise<{ url: string | null; error: string | null }> {
  return uploadAsset({ uri, base64 }, userId, 'chat-media');
}
