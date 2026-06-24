/*
 * @Description: Push Notification service — registration, token management
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getSupabaseClient } from '@/template';

// ── Foreground notification handler ───────────────────────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Request permission and register the device for push notifications.
 * Stores the Expo push token in user_profiles.
 */
export async function registerForPushNotifications(userId: string): Promise<string | null> {
  // Web does not support Expo push
  if (Platform.OS === 'web') return null;

  // Android: create notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('messages', {
      name: 'Сообщения',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#2DA8FF',
      sound: 'default',
      enableLights: true,
      enableVibrate: true,
    });
  }

  // Check / request permission
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('[push] Permission not granted');
    return null;
  }

  try {
    // Get Expo push token (works without projectId in development)
    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token = tokenData.data;

    if (!token) return null;

    // Persist to database
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('user_profiles')
      .update({ push_token: token })
      .eq('id', userId);

    if (error) {
      console.log('[push] Failed to save token:', error.message);
    } else {
      console.log('[push] Token registered:', token.substring(0, 30) + '...');
    }

    return token;
  } catch (err) {
    // Silently fail in emulators / simulators (no valid push token)
    console.log('[push] getExpoPushTokenAsync error:', String(err));
    return null;
  }
}

/**
 * Remove the push token from the database (call on logout).
 */
export async function clearPushToken(userId: string): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    await supabase
      .from('user_profiles')
      .update({ push_token: null })
      .eq('id', userId);
    console.log('[push] Token cleared');
  } catch {}
}

/**
 * Set the app badge count (iOS).
 */
export async function setBadgeCount(count: number): Promise<void> {
  try {
    await Notifications.setBadgeCountAsync(count);
  } catch {}
}

/**
 * Clear the app badge (call when user opens the app / reads messages).
 */
export async function clearBadge(): Promise<void> {
  await setBadgeCount(0);
}
