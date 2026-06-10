/*
 * @Description: Login / Register Screen
 */
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth, useAlert } from '@/template';
import { Colors, Font, Spacing, Radius } from '@/constants/theme';

type Mode = 'login' | 'register' | 'otp';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { sendOTP, verifyOTPAndLogin, signInWithPassword, operationLoading } = useAuth();
  const { showAlert } = useAlert();

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [showPass, setShowPass] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      showAlert('Заполните все поля', 'Введите email и пароль');
      return;
    }
    const { error } = await signInWithPassword(email.trim(), password);
    if (error) showAlert('Ошибка входа', error);
  };

  const handleSendOTP = async () => {
    if (!email.trim()) { showAlert('Введите email'); return; }
    if (!password || password.length < 6) { showAlert('Пароль минимум 6 символов'); return; }
    if (password !== confirmPassword) { showAlert('Пароли не совпадают'); return; }
    const { error } = await sendOTP(email.trim());
    if (error) { showAlert('Ошибка', error); return; }
    setMode('otp');
    showAlert('Код отправлен', 'Проверьте вашу почту ' + email.trim());
  };

  const handleVerifyOTP = async () => {
    if (!otp.trim() || otp.length < 4) { showAlert('Введите код из письма'); return; }
    const { error } = await verifyOTPAndLogin(email.trim(), otp.trim(), { password });
    if (error) showAlert('Неверный код', error);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <View style={styles.logoWrap}>
          <View style={styles.logoCircle}>
            <MaterialIcons name="chat" size={40} color={Colors.primary} />
          </View>
          <Text style={styles.appName}>NexTalk</Text>
          <Text style={styles.tagline}>Мессенджер нового поколения</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          {/* Mode selector (login / register) */}
          {mode !== 'otp' ? (
            <View style={styles.modeRow}>
              <TouchableOpacity
                style={[styles.modeBtn, mode === 'login' && styles.modeBtnActive]}
                onPress={() => setMode('login')}
                activeOpacity={0.8}
              >
                <Text style={[styles.modeBtnText, mode === 'login' && styles.modeBtnTextActive]}>
                  Войти
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeBtn, mode === 'register' && styles.modeBtnActive]}
                onPress={() => setMode('register')}
                activeOpacity={0.8}
              >
                <Text style={[styles.modeBtnText, mode === 'register' && styles.modeBtnTextActive]}>
                  Регистрация
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* OTP Step */}
          {mode === 'otp' ? (
            <>
              <View style={styles.otpInfo}>
                <MaterialIcons name="mark-email-unread" size={32} color={Colors.primary} />
                <Text style={styles.otpTitle}>Подтверждение email</Text>
                <Text style={styles.otpDesc}>
                  Код из 4 цифр отправлен на{'\n'}
                  <Text style={{ color: Colors.primary }}>{email}</Text>
                </Text>
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Код подтверждения</Text>
                <TextInput
                  style={styles.input}
                  value={otp}
                  onChangeText={setOtp}
                  placeholder="••••"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="number-pad"
                  maxLength={6}
                  textAlign="center"
                  returnKeyType="done"
                  onSubmitEditing={handleVerifyOTP}
                />
              </View>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleVerifyOTP}
                activeOpacity={0.85}
                disabled={operationLoading}
              >
                {operationLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryBtnText}>Подтвердить и создать аккаунт</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setMode('register')} style={styles.backBtn}>
                <MaterialIcons name="arrow-back" size={16} color={Colors.textSecondary} />
                <Text style={styles.backBtnText}>Назад</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {/* Email */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email</Text>
                <View style={styles.inputWrap}>
                  <MaterialIcons name="email" size={18} color={Colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.inputWithIcon}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="example@mail.com"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="next"
                  />
                </View>
              </View>

              {/* Password */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Пароль</Text>
                <View style={styles.inputWrap}>
                  <MaterialIcons name="lock" size={18} color={Colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.inputWithIcon}
                    value={password}
                    onChangeText={setPassword}
                    placeholder={mode === 'register' ? 'Минимум 6 символов' : 'Ваш пароль'}
                    placeholderTextColor={Colors.textMuted}
                    secureTextEntry={!showPass}
                    returnKeyType={mode === 'register' ? 'next' : 'done'}
                    onSubmitEditing={mode === 'login' ? handleLogin : undefined}
                  />
                  <TouchableOpacity onPress={() => setShowPass(!showPass)} style={styles.eyeBtn}>
                    <MaterialIcons
                      name={showPass ? 'visibility-off' : 'visibility'}
                      size={18}
                      color={Colors.textMuted}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Confirm password for register */}
              {mode === 'register' ? (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Подтвердите пароль</Text>
                  <View style={styles.inputWrap}>
                    <MaterialIcons name="lock-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
                    <TextInput
                      style={styles.inputWithIcon}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      placeholder="Повторите пароль"
                      placeholderTextColor={Colors.textMuted}
                      secureTextEntry={!showPass}
                      returnKeyType="done"
                      onSubmitEditing={handleSendOTP}
                    />
                  </View>
                </View>
              ) : null}

              {/* CTA */}
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={mode === 'login' ? handleLogin : handleSendOTP}
                activeOpacity={0.85}
                disabled={operationLoading}
              >
                {operationLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryBtnText}>
                    {mode === 'login' ? 'Войти' : 'Получить код'}
                  </Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>

        <Text style={styles.footer}>
          Регистрируясь, вы соглашаетесь с Условиями использования
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.xl },
  logoWrap: { alignItems: 'center', marginBottom: Spacing.xl },
  logoCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.primary + '22',
    borderWidth: 2, borderColor: Colors.primary + '55',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  appName: { fontSize: Font.xxl, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -0.5 },
  tagline: { fontSize: Font.sm, color: Colors.textSecondary, marginTop: 4 },
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.xl, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.border,
  },
  modeRow: {
    flexDirection: 'row', backgroundColor: Colors.bgSection,
    borderRadius: Radius.lg, padding: 4, marginBottom: Spacing.md,
  },
  modeBtn: { flex: 1, paddingVertical: 10, borderRadius: Radius.md, alignItems: 'center' },
  modeBtnActive: { backgroundColor: Colors.primary },
  modeBtnText: { fontSize: Font.base, fontWeight: '600', color: Colors.textMuted },
  modeBtnTextActive: { color: '#fff' },
  inputGroup: { marginBottom: Spacing.md },
  label: { fontSize: Font.sm, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6 },
  input: {
    backgroundColor: Colors.inputBg, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: Spacing.md, paddingVertical: 14,
    fontSize: Font.md, color: Colors.textPrimary, letterSpacing: 4,
  },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.inputBg, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border,
  },
  inputIcon: { paddingLeft: Spacing.md },
  inputWithIcon: {
    flex: 1, paddingHorizontal: Spacing.sm, paddingVertical: 14,
    fontSize: Font.base, color: Colors.textPrimary,
  },
  eyeBtn: { paddingHorizontal: Spacing.md, paddingVertical: 14 },
  primaryBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.lg,
    paddingVertical: 16, alignItems: 'center', marginTop: Spacing.xs,
  },
  primaryBtnText: { fontSize: Font.base, fontWeight: '700', color: '#fff' },
  otpInfo: { alignItems: 'center', paddingVertical: Spacing.md, gap: 8, marginBottom: Spacing.md },
  otpTitle: { fontSize: Font.md, fontWeight: '700', color: Colors.textPrimary },
  otpDesc: { fontSize: Font.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  backBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: Spacing.md, gap: 4 },
  backBtnText: { fontSize: Font.sm, color: Colors.textSecondary },
  footer: { textAlign: 'center', fontSize: Font.xs, color: Colors.textMuted, marginTop: Spacing.lg },
});
