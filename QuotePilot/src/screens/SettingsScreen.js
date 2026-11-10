import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Card, Header, SectionTitle } from '../components/ui';
import { getOfferedServices, tradeLabel } from '../data/trades';
import { FREE_QUOTES_PER_MONTH, quotesUsedThisMonth } from '../services/billing';
import { colors } from '../theme';
import { confirm } from '../utils/dialogs';
import { formatMoney } from '../utils/money';

export default function SettingsScreen({ profile, plan, usage, onBack, onEditProfile, onUpgrade, onCancelPro, onReset }) {
  const reset = async () => {
    if (await confirm('Erase everything?', 'This deletes your business profile and all quotes from this device. It can’t be undone.', 'Erase', true)) onReset();
  };
  const services = getOfferedServices(profile);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header title="Settings" onBack={onBack} />
      <ScrollView contentContainerStyle={styles.body}>
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
          <Text style={styles.detail}>
            {plan.pro
              ? `Unlimited quotes, invoices, your branding, no QuotePilot footer.${plan.demo ? ' (Demo unlock — no charge was made.)' : ''}`
              : `${quotesUsedThisMonth(usage)} of ${FREE_QUOTES_PER_MONTH} free quotes used this month.`}
          </Text>
          {plan.pro ? (
            plan.demo ? <Row icon="refresh-outline" label="Switch back to the free plan" onPress={onCancelPro} /> : null
          ) : (
            <Row icon="star" label="Upgrade to Pro" accent onPress={onUpgrade} />
          )}
        </Card>

        <SectionTitle>Data</SectionTitle>
        <Card>
          <Text style={styles.detail}>Your profile and quotes are stored on this device only.</Text>
          <Row icon="trash-outline" label="Erase all data" danger onPress={reset} />
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
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.line, minHeight: 44 },
  rowText: { flex: 1, fontSize: 15, fontWeight: '700' },
});
