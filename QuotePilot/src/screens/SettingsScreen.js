import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Button, Card, Field, Header, SectionTitle } from '../components/ui';
import { getOfferedServices, tradeLabel } from '../data/trades';
import { FREE_QUOTES_PER_MONTH, describePlan, quotesUsedThisMonth } from '../services/billing';
import { colors } from '../theme';
import { formatMoney } from '../utils/money';

function syncLabel(syncState) {
  if (syncState.status === 'syncing') return ['sync', colors.sub, 'Syncing…'];
  if (syncState.status === 'offline') return ['cloud-offline-outline', colors.accent, 'Offline — changes are saved on this device and will sync when you’re back online.'];
  if (syncState.status === 'error') return ['alert-circle-outline', colors.danger, 'Sync ran into a problem. Your changes are safe on this device; try again shortly.'];
  if (syncState.pending) return ['cloud-upload-outline', colors.sub, 'Changes waiting to sync.'];
  return ['cloud-done-outline', colors.success, 'Everything is backed up.'];
}

export default function SettingsScreen({ account, profile, plan, usage, syncState, onBack, onEditProfile, onUpgrade, onManageSubscription, onSyncNow, onSignOut, onDeleteAccount }) {
  const [deleting, setDeleting] = useState(false);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const services = getOfferedServices(profile);
  const [syncIcon, syncColor, syncText] = syncLabel(syncState);

  const confirmDelete = async () => {
    setBusy(true);
    setError('');
    try {
      await onDeleteAccount(password);
    } catch (failure) {
      setError(failure.message);
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header title="Settings" onBack={onBack} />
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <SectionTitle>Business profile</SectionTitle>
        <Card>
          <Text style={styles.name}>{profile.businessName}</Text>
          <Text style={styles.detail}>{tradeLabel(profile)} · {services.length} service{services.length === 1 ? '' : 's'}</Text>
          <Text style={styles.detail}>
            {formatMoney(profile.hourlyRate, profile.currency)}/hr · {profile.markupPct || 0}% materials markup · {profile.taxRate || 0}% tax
          </Text>
          <Row icon="create-outline" label="Edit profile, pricing & quote defaults" onPress={onEditProfile} />
        </Card>

        <SectionTitle>Plan</SectionTitle>
        <Card>
          <Text style={styles.name}>{plan.pro ? 'QuotePilot Pro' : 'Free plan'}</Text>
          <Text style={styles.detail} testID="plan-detail">
            {plan.pro
              ? describePlan(plan)
              : `${describePlan(plan) ? `${describePlan(plan)} ` : ''}${quotesUsedThisMonth(usage)} of ${FREE_QUOTES_PER_MONTH} free quotes used this month.`}
          </Text>
          {plan.pro ? (
            <Row icon="card-outline" label="Manage subscription & billing" onPress={onManageSubscription} />
          ) : (
            <Row icon="star" label="Upgrade to Pro" accent onPress={onUpgrade} />
          )}
        </Card>

        <SectionTitle>Account</SectionTitle>
        <Card>
          <Text style={styles.name} testID="account-email">{account.email}</Text>
          <View style={styles.syncRow}>
            <Ionicons name={syncIcon} size={17} color={syncColor} />
            <Text style={[styles.detail, { flex: 1, marginTop: 0 }]} testID="sync-status">{syncText}</Text>
          </View>
          <Row icon="refresh-outline" label="Sync now" onPress={onSyncNow} />
          <Row icon="log-out-outline" label="Sign out" onPress={onSignOut} />
          {deleting ? (
            <View style={styles.deleteBox}>
              <Text style={styles.deleteTitle}>Delete your account?</Text>
              <Text style={styles.detail}>
                This permanently deletes your profile, quotes and invoices from every device{plan.pro ? ' and cancels your subscription' : ''}. It can’t be undone.
              </Text>
              <Field style={{ marginTop: 12 }} label="Enter your password to confirm" secureTextEntry autoCapitalize="none" value={password} onChangeText={setPassword} />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <View style={styles.deleteButtons}>
                <Button label="Cancel" variant="ghost" style={{ flex: 1 }} onPress={() => { setDeleting(false); setPassword(''); setError(''); }} />
                <Button testID="confirm-delete" label="Delete account" variant="danger" style={{ flex: 1.3 }} loading={busy} disabled={!password} onPress={confirmDelete} />
              </View>
            </View>
          ) : (
            <Row icon="trash-outline" label="Delete account" danger onPress={() => setDeleting(true)} />
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ icon, label, onPress, accent, danger }) {
  const color = danger ? colors.danger : accent ? colors.accent : colors.primary;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={styles.row}>
      <Ionicons name={icon} size={19} color={color} />
      <Text style={[styles.rowText, { color }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.faint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  body: { paddingHorizontal: 16, paddingBottom: 40 },
  name: { fontSize: 18, fontWeight: '800', color: colors.ink },
  detail: { fontSize: 14, color: colors.sub, marginTop: 4, lineHeight: 20 },
  syncRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.line, minHeight: 44 },
  rowText: { flex: 1, fontSize: 15, fontWeight: '700' },
  deleteBox: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.line },
  deleteTitle: { fontSize: 16, fontWeight: '800', color: colors.danger },
  deleteButtons: { flexDirection: 'row', gap: 10, marginTop: 4 },
  error: { fontSize: 13, color: colors.danger, marginBottom: 10 },
});
