/*
 * @Description: Settings screen — theme, profile, notifications, logout
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
import { useTheme, ThemeMode } from '@/contexts/ThemeContext';
import { updateUserProfile } from '@/services/social';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { showAlert } = useAlert();
  const { colors, mode, setMode, isDark } = useTheme();

  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState('');
  const [savingUsername, setSavingUsername] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [editingUsername, setEditingUsername] = useState(false);

  const handleSaveUsername = async () => {
    if (!username.trim() || username.trim().length < 3) {
      showAlert('Ошибка', 'Username должен содержать минимум 3 символа');
      return;
    }
    setSavingUsername(true);
    const { error } = await updateUserProfile(user?.id || '', { username: username.trim() });
    setSavingUsername(false);
    if (error) showAlert('Ошибка', error);
    else { showAlert('Готово', 'Username обновлён'); setEditingUsername(false); }
  };

  const handleLogout = () => {
    showAlert('Выйти из аккаунта?', 'Вы будете перенаправлены на экран входа', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Выйти', style: 'destructive', onPress: async () => { await logout(); } },
    ]);
  };

  const initials = (user?.username || user?.email || '?')[0].toUpperCase();
  const themeOptions: { key: ThemeMode; label: string; icon: keyof typeof MaterialIcons.glyphMap }[] = [
    { key: 'system', label: 'Системная', icon: 'brightness-auto' },
    { key: 'dark', label: 'Тёмная', icon: 'brightness-2' },
    { key: 'light', label: 'Светлая', icon: 'brightness-7' },
  ];

  return (
    <View style={[styles.root, { paddingTop: insets.top, backgroundColor: colors.bg }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <MaterialIcons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Настройки</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Profile Card */}
        <View style={[styles.profileCard, { backgroundColor: colors.bgCard, borderColor: colors.primary + '33' }]}>
          <View style={[styles.profileAvatar, { backgroundColor: colors.primary + '33', borderColor: colors.primary + '66' }]}>
            <Text style={[styles.profileAvatarText, { color: colors.primary }]}>{initials}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: colors.textPrimary }]}>{user?.username || 'Без имени'}</Text>
            <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>{user?.email}</Text>
          </View>
        </View>

        {/* Account */}
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>АККАУНТ</Text>
        <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: colors.primary + '22' }]}>
                <MaterialIcons name="person" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>Username</Text>
                {editingUsername ? (
                  <TextInput
                    style={[styles.usernameInput, { color: colors.textPrimary, borderBottomColor: colors.primary }]}
                    value={username}
                    onChangeText={setUsername}
                    placeholder="Введите username"
                    placeholderTextColor={colors.textMuted}
                    autoFocus
                    autoCapitalize="none"
                  />
                ) : (
                  <Text style={[styles.settingValue, { color: colors.textSecondary }]}>
                    {user?.username ? `@${user.username}` : 'Не задан'}
                  </Text>
                )}
              </View>
            </View>
            {editingUsername ? (
              <View style={styles.editActions}>
                <TouchableOpacity onPress={() => { setEditingUsername(false); setUsername(user?.username || ''); }}
                  style={[styles.cancelBtn, { backgroundColor: colors.bgSection }]}>
                  <MaterialIcons name="close" size={18} color={colors.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSaveUsername} style={[styles.saveBtn, { backgroundColor: colors.primary }]}
                  disabled={savingUsername}>
                  {savingUsername ? <ActivityIndicator size="small" color="#fff" /> : <MaterialIcons name="check" size={18} color="#fff" />}
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={() => setEditingUsername(true)} style={styles.editBtn}>
                <MaterialIcons name="edit" size={18} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: colors.accent + '22' }]}>
                <MaterialIcons name="email" size={18} color={colors.accent} />
              </View>
              <View>
                <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>Email</Text>
                <Text style={[styles.settingValue, { color: colors.textSecondary }]}>{user?.email || '—'}</Text>
              </View>
            </View>
            <MaterialIcons name="lock-outline" size={16} color={colors.textMuted} />
          </View>
        </View>

        {/* Theme */}
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>ТЕМА ОФОРМЛЕНИЯ</Text>
        <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          {themeOptions.map((opt, idx) => (
            <React.Fragment key={opt.key}>
              <TouchableOpacity
                style={styles.settingRow}
                onPress={() => setMode(opt.key)}
                activeOpacity={0.75}
              >
                <View style={styles.settingLeft}>
                  <View style={[styles.settingIcon, { backgroundColor: colors.bgSection }]}>
                    <MaterialIcons name={opt.icon} size={18} color={mode === opt.key ? colors.primary : colors.textMuted} />
                  </View>
                  <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>{opt.label}</Text>
                </View>
                {mode === opt.key ? <MaterialIcons name="check-circle" size={20} color={colors.primary} /> : <View style={[styles.radioOuter, { borderColor: colors.border }]} />}
              </TouchableOpacity>
              {idx < themeOptions.length - 1 ? <View style={[styles.divider, { backgroundColor: colors.border }]} /> : null}
            </React.Fragment>
          ))}
        </View>

        {/* Notifications */}
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>УВЕДОМЛЕНИЯ</Text>
        <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: colors.warning + '22' }]}>
                <MaterialIcons name="notifications" size={18} color={colors.warning} />
              </View>
              <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>Уведомления</Text>
            </View>
            <Switch value={notifEnabled} onValueChange={setNotifEnabled}
              trackColor={{ false: colors.border, true: colors.primary + '88' }}
              thumbColor={notifEnabled ? colors.primary : colors.textMuted} />
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: colors.success + '22' }]}>
                <MaterialIcons name="volume-up" size={18} color={colors.success} />
              </View>
              <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>Звук</Text>
            </View>
            <Switch value={soundEnabled} onValueChange={setSoundEnabled}
              trackColor={{ false: colors.border, true: colors.primary + '88' }}
              thumbColor={soundEnabled ? colors.primary : colors.textMuted} />
          </View>
        </View>

        {/* About */}
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>О ПРИЛОЖЕНИИ</Text>
        <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: '#A371F722' }]}>
                <MaterialIcons name="chat" size={18} color="#A371F7" />
              </View>
              <View>
                <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>Приложение</Text>
                <Text style={[styles.settingValue, { color: colors.textSecondary }]}>ИТП Messenger</Text>
              </View>
            </View>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: colors.textMuted + '22' }]}>
                <MaterialIcons name="info-outline" size={18} color={colors.textMuted} />
              </View>
              <View>
                <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>Версия</Text>
                <Text style={[styles.settingValue, { color: colors.textSecondary }]}>2.0.0</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity style={[styles.logoutBtn, { backgroundColor: colors.danger + '18', borderColor: colors.danger + '44' }]}
          onPress={handleLogout} activeOpacity={0.8}>
          <MaterialIcons name="logout" size={20} color={colors.danger} />
          <Text style={[styles.logoutText, { color: colors.danger }]}>Выйти из аккаунта</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  scroll: { flex: 1, paddingHorizontal: 16 },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 16, borderRadius: 20, padding: 16, margin: 16, borderWidth: 1 },
  profileAvatar: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  profileAvatarText: { fontSize: 24, fontWeight: '700' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 17, fontWeight: '700' },
  profileEmail: { fontSize: 13, marginTop: 3 },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 8, marginTop: 4, paddingHorizontal: 16 },
  card: { borderRadius: 14, borderWidth: 1, marginHorizontal: 16, marginBottom: 20, overflow: 'hidden' },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  settingIcon: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  settingLabel: { fontSize: 15, fontWeight: '500' },
  settingValue: { fontSize: 13, marginTop: 2 },
  divider: { height: 1, marginLeft: 64 },
  usernameInput: { fontSize: 13, borderBottomWidth: 1, paddingVertical: 2, marginTop: 2, minWidth: 120 },
  editActions: { flexDirection: 'row', gap: 8 },
  editBtn: { padding: 8 },
  cancelBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  saveBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  radioOuter: { width: 20, height: 20, borderRadius: 10, borderWidth: 2 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 14, paddingVertical: 16, borderWidth: 1, marginHorizontal: 16, marginBottom: 16 },
  logoutText: { fontSize: 15, fontWeight: '700' },
});
