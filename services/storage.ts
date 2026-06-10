// Storage service for uploading media
import { getSupabaseClient } from '@/template';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

export async function pickAndUploadImage(userId: string): Promise<{ url: string | null; error: string | null }> {
  // Request permissions
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

  if (result.canceled || !result.assets?.[0]) {
    return { url: null, error: null };
  }

  const asset = result.assets[0];
  const supabase = getSupabaseClient();

  const ext = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
  const mimeType = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : 'image/jpeg';
  const fileName = `${userId}/${Date.now()}.${ext}`;

  try {
    if (Platform.OS === 'web') {
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const { error: uploadError } = await supabase.storage
        .from('chat-media')
        .upload(fileName, blob, { contentType: mimeType, upsert: true });
      if (uploadError) return { url: null, error: uploadError.message };
    } else {
      if (!asset.base64) return { url: null, error: 'Не удалось получить данные изображения' };
      const base64Data = asset.base64;
      const byteArray = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
      const { error: uploadError } = await supabase.storage
        .from('chat-media')
        .upload(fileName, byteArray, { contentType: mimeType, upsert: true });
      if (uploadError) return { url: null, error: uploadError.message };
    }

    const { data: urlData } = supabase.storage.from('chat-media').getPublicUrl(fileName);
    return { url: urlData.publicUrl, error: null };
  } catch (e: any) {
    return { url: null, error: e.message };
  }
}

export async function takePhotoAndUpload(userId: string): Promise<{ url: string | null; error: string | null }> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    return { url: null, error: 'Нет доступа к камере. Разрешите доступ в настройках.' };
  }

  const result = await ImagePicker.launchCameraAsync({
    quality: 0.8,
    base64: true,
  });

  if (result.canceled || !result.assets?.[0]) {
    return { url: null, error: null };
  }

  const asset = result.assets[0];
  const supabase = getSupabaseClient();

  const ext = 'jpg';
  const mimeType = 'image/jpeg';
  const fileName = `${userId}/${Date.now()}.${ext}`;

  try {
    if (!asset.base64) return { url: null, error: 'Не удалось получить данные фото' };
    const byteArray = Uint8Array.from(atob(asset.base64), (c) => c.charCodeAt(0));
    const { error: uploadError } = await supabase.storage
      .from('chat-media')
      .upload(fileName, byteArray, { contentType: mimeType, upsert: true });
    if (uploadError) return { url: null, error: uploadError.message };

    const { data: urlData } = supabase.storage.from('chat-media').getPublicUrl(fileName);
    return { url: urlData.publicUrl, error: null };
  } catch (e: any) {
    return { url: null, error: e.message };
  }
}
