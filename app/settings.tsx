/*
 * @Description: Settings Screen
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth, useAlert } from '@/template';
import { Colors, Font, Spacing, Radius } from '@/constants/theme';
import { updateUserProfile } from '@/services/chats';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { showAlert } = useAlert();

  const [username, setUsername] = useState(user?.username || '');
  const [savingUsername, setSavingUsername] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [editingUsername, setEditingUsername] = useState(false);

  const handleSaveUsername = async () => {
    if (!username.trim()) {
      showAlert('Ошибка', 'Username не может быть пустым');
      return;
    }
    if (username.trim().length < 3) {
      showAlert('Ошибка', 'Username должен содержать минимум 3 символа');
      return;
    }
    setSavingUsername(true);
    const { error } = await updateUserProfile(user?.id || '', { username: username.trim() });
    setSavingUsername(false);
    if (error) {
      showAlert('Ошибка', error);
    } else {
      showAlert('Готово', 'Username обновлён');
      setEditingUsername(false);
    }
  };

  const handleLogout = () => {
    showAlert('Выйти из аккаунта?', 'Вы будете перенаправлены на экран входа', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Выйти',
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  const initials = (user?.username || user?.email || '?')[0].toUpperCase();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Настройки</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>{initials}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.username || 'Без имени'}</Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
          </View>
        </View>

        {/* Account Section */}
        <Text style={styles.sectionLabel}>АККАУНТ</Text>
        <View style={styles.card}>
          {/* Edit username */}
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: Colors.primary + '22' }]}>
                <MaterialIcons name="person" size={18} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingLabel}>Username</Text>
                {editingUsername ? (
                  <TextInput
                    style={styles.usernameInput}
                    value={username}
                    onChangeText={setUsername}
                    placeholder="Введите username"
                    placeholderTextColor={Colors.textMuted}
                    autoFocus
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                ) : (
                  <Text style={styles.settingValue}>
                    {user?.username ? `@${user.username}` : 'Не задан'}
                  </Text>
                )}
              </View>
            </View>
            {editingUsername ? (
              <View style={styles.editActions}>
                <TouchableOpacity
                  onPress={() => {
                    setEditingUsername(false);
                    setUsername(user?.username || '');
                  }}
                  style={styles.cancelBtn}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="close" size={18} color={Colors.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSaveUsername}
                  style={styles.saveBtn}
                  disabled={savingUsername}
                  activeOpacity={0.7}
                >
                  {savingUsername ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <MaterialIcons name="check" size={18} color="#fff" />
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => setEditingUsername(true)}
                style={styles.editBtn}
                activeOpacity={0.7}
              >
                <MaterialIcons name="edit" size={18} color={Colors.primary} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.divider} />

          {/* Email (read-only) */}
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: Colors.accent + '22' }]}>
                <MaterialIcons name="email" size={18} color={Colors.accent} />
              </View>
              <View>
                <Text style={styles.settingLabel}>Email</Text>
                <Text style={styles.settingValue}>{user?.email || '—'}</Text>
              </View>
            </View>
            <MaterialIcons name="lock-outline" size={16} color={Colors.textMuted} />
          </View>
        </View>

        {/* Notifications */}
        <Text style={styles.sectionLabel}>УВЕДОМЛЕНИЯ</Text>
        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: Colors.warning + '22' }]}>
                <MaterialIcons name="notifications" size={18} color={Colors.warning} />
              </View>
              <Text style={styles.settingLabel}>Уведомления о сообщениях</Text>
            </View>
            <Switch
              value={notifEnabled}
              onValueChange={setNotifEnabled}
              trackColor={{ false: Colors.border, true: Colors.primary + '88' }}
              thumbColor={notifEnabled ? Colors.primary : Colors.textMuted}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: Colors.success + '22' }]}>
                <MaterialIcons name="volume-up" size={18} color={Colors.success} />
              </View>
              <Text style={styles.settingLabel}>Звук уведомлений</Text>
            </View>
            <Switch
              value={soundEnabled}
              onValueChange={setSoundEnabled}
              trackColor={{ false: Colors.border, true: Colors.primary + '88' }}
              thumbColor={soundEnabled ? Colors.primary : Colors.textMuted}
            />
          </View>
        </View>

        {/* App Info */}
        <Text style={styles.sectionLabel}>О ПРИЛОЖЕНИИ</Text>
        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: '#A371F722' }]}>
                <MaterialIcons name="chat" size={18} color="#A371F7" />
              </View>
              <View>
                <Text style={styles.settingLabel}>Приложение</Text>
                <Text style={styles.settingValue}>ИТП Messenger</Text>
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: Colors.textMuted + '22' }]}>
                <MaterialIcons name="info-outline" size={18} color={Colors.textMuted} />
              </View>
              <View>
                <Text style={styles.settingLabel}>Версия</Text>
                <Text style={styles.settingValue}>1.0.0</Text>
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: Colors.textMuted + '22' }]}>
                <MaterialIcons name="storage" size={18} color={Colors.textMuted} />
              </View>
              <View>
                <Text style={styles.settingLabel}>База данных</Text>
                <Text style={styles.settingValue}>OnSpace Cloud (PostgreSQL)</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <MaterialIcons name="logout" size={20} color={Colors.danger} />
          <Text style={styles.logoutText}>Выйти из аккаунта</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: Font.md, fontWeight: '700', color: Colors.textPrimary },
  scroll: { flex: 1, paddingHorizontal: Spacing.md },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.xl,
    padding: Spacing.md,
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.primary + '33',
  },
  profileAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary + '33',
    borderWidth: 2,
    borderColor: Colors.primary + '66',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarText: { fontSize: Font.xl, fontWeight: '700', color: Colors.primary },
  profileInfo: { flex: 1 },
  profileName: { fontSize: Font.md, fontWeight: '700', color: Colors.textPrimary },
  profileEmail: { fontSize: Font.sm, color: Colors.textSecondary, marginTop: 3 },
  sectionLabel: {
    fontSize: Font.xs,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 4,
  },
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
  },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  settingLabel: { fontSize: Font.base, color: Colors.textPrimary, fontWeight: '500' },
  settingValue: { fontSize: Font.sm, color: Colors.textSecondary, marginTop: 2 },
  divider: { height: 1, backgroundColor: Colors.border, marginLeft: 64 },
  usernameInput: {
    fontSize: Font.sm,
    color: Colors.textPrimary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.primary,
    paddingVertical: 2,
    marginTop: 2,
    minWidth: 120,
  },
  editActions: { flexDirection: 'row', gap: 8 },
  editBtn: { padding: 8 },
  cancelBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.bgSection,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.danger + '18',
    borderRadius: Radius.lg,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: Colors.danger + '44',
    marginBottom: Spacing.lg,
  },
  logoutText: { fontSize: Font.base, fontWeight: '700', color: Colors.danger },
});
