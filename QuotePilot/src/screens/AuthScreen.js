import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Button, Field } from '../components/ui';
import { api } from '../services/api';
import { colors, radius } from '../theme';

// mode: 'signup' | 'login' | 'forgot'
export default function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const switchTo = (next) => {
    setMode(next);
    setError('');
    setNotice('');
  };

  const submit = async () => {
    setError('');
    setNotice('');
    const address = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
      setError('Enter a valid email address.');
      return;
    }
    if (mode !== 'forgot' && password.length < 8) {
      setError(mode === 'signup' ? 'Use a password of at least 8 characters.' : 'Enter your password.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'forgot') {
        await api.forgotPassword(address);
        setNotice(`If there’s an account for ${address}, we’ve emailed a link to reset the password.`);
        setMode('login');
      } else {
        const result = mode === 'signup' ? await api.signup(address, password) : await api.login(address, password);
        await onAuthenticated(result);
      }
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  };

  const titles = {
    signup: ['Create your account', 'Your quotes are backed up and available on every device you sign in to.'],
    login: ['Welcome back', 'Sign in to pick up where you left off.'],
    forgot: ['Reset your password', 'Enter your email and we’ll send you a link to choose a new one.'],
  }[mode];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <View style={styles.brand}>
            <View style={styles.logo}><Ionicons name="paper-plane" size={22} color="#fff" /></View>
            <Text style={styles.brandName}>QuotePilot</Text>
          </View>
          <Text style={styles.title}>{titles[0]}</Text>
          <Text style={styles.lead}>{titles[1]}</Text>

          {notice ? (
            <View style={[styles.message, styles.notice]}>
              <Ionicons name="mail-outline" size={18} color={colors.success} />
              <Text style={styles.messageText}>{notice}</Text>
            </View>
          ) : null}

          <Field
            label="Email"
            placeholder="you@yourbusiness.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            value={email}
            onChangeText={setEmail}
          />
          {mode !== 'forgot' && (
            <Field
              label="Password"
              placeholder={mode === 'signup' ? 'At least 8 characters' : 'Your password'}
              secureTextEntry
              autoCapitalize="none"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              textContentType={mode === 'signup' ? 'newPassword' : 'password'}
              value={password}
              onChangeText={setPassword}
              onSubmitEditing={submit}
              returnKeyType="go"
            />
          )}

          {error ? (
            <View style={[styles.message, styles.error]} accessibilityRole="alert">
              <Ionicons name="alert-circle" size={18} color={colors.danger} />
              <Text style={styles.messageText} testID="auth-error">{error}</Text>
            </View>
          ) : null}

          <Button
            testID="auth-submit"
            label={mode === 'signup' ? 'Create account' : mode === 'login' ? 'Sign in' : 'Email me a reset link'}
            variant="accent"
            loading={busy}
            onPress={submit}
            style={{ marginTop: 6 }}
          />

          {mode === 'login' && (
            <Pressable onPress={() => switchTo('forgot')} accessibilityRole="button" style={styles.linkRow}>
              <Text style={styles.link}>Forgot your password?</Text>
            </Pressable>
          )}

          <Pressable testID="auth-switch" onPress={() => switchTo(mode === 'signup' ? 'login' : 'signup')} accessibilityRole="button" style={styles.linkRow}>
            <Text style={styles.switchText}>
              {mode === 'signup' ? 'Already have an account? ' : mode === 'login' ? 'New to QuotePilot? ' : 'Remembered it? '}
              <Text style={styles.link}>{mode === 'signup' ? 'Sign in' : mode === 'login' ? 'Create an account' : 'Back to sign in'}</Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  body: { padding: 24, paddingTop: 40, maxWidth: 480, width: '100%', alignSelf: 'center' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 32 },
  logo: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  brandName: { fontSize: 20, fontWeight: '800', color: colors.primary },
  title: { fontSize: 28, fontWeight: '800', color: colors.ink },
  lead: { fontSize: 15, color: colors.sub, marginTop: 6, marginBottom: 24, lineHeight: 21 },
  message: { flexDirection: 'row', gap: 8, borderRadius: radius.md, padding: 12, marginBottom: 14 },
  error: { backgroundColor: colors.dangerSoft },
  notice: { backgroundColor: colors.successSoft },
  messageText: { flex: 1, fontSize: 14, color: colors.ink, lineHeight: 19 },
  linkRow: { alignItems: 'center', paddingVertical: 14 },
  link: { fontSize: 14, fontWeight: '700', color: colors.primary },
  switchText: { fontSize: 14, color: colors.sub },
});
