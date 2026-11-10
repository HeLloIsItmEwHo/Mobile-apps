import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '../components/ui';
import { BILLING_LIVE, FREE_QUOTES_PER_MONTH, PLANS, PRO_FEATURES, purchase, restore } from '../services/billing';
import { colors, radius } from '../theme';
import { notify } from '../utils/dialogs';

export default function PaywallScreen({ reason, onClose, onPurchased }) {
  const [planId, setPlanId] = useState('annual');
  const [busy, setBusy] = useState(false);

  const buy = async () => {
    setBusy(true);
    try {
      onPurchased(await purchase(planId));
    } catch (error) {
      notify('Purchase didn’t go through', String(error?.message || error));
    } finally {
      setBusy(false);
    }
  };

  const restorePurchase = async () => {
    const plan = await restore();
    if (plan) onPurchased(plan);
    else notify('Nothing to restore', 'We couldn’t find a previous TradeQuote Pro purchase on this account.');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Pressable onPress={onClose} hitSlop={12} style={styles.close} accessibilityRole="button" accessibilityLabel="Close">
        <Ionicons name="close" size={26} color="#fff" />
      </Pressable>
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.badge}><Ionicons name="star" size={14} color="#fff" /><Text style={styles.badgeText}>TRADEQUOTE PRO</Text></View>
        <Text style={styles.title}>Win more jobs with quotes that look the part</Text>
        <Text style={styles.lead}>
          {reason === 'limit'
            ? `You’ve used your ${FREE_QUOTES_PER_MONTH} free quotes this month. Go Pro to keep quoting.`
            : 'One extra job a year pays for it many times over.'}
        </Text>

        {PRO_FEATURES.map(([icon, heading, detail]) => (
          <View key={heading} style={styles.feature}>
            <View style={styles.featureIcon}><Ionicons name={icon} size={18} color={colors.accent} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.featureTitle}>{heading}</Text>
              <Text style={styles.featureText}>{detail}</Text>
            </View>
          </View>
        ))}

        <View style={{ height: 10 }} />
        {PLANS.map((plan) => {
          const on = plan.id === planId;
          return (
            <Pressable key={plan.id} testID={`plan-${plan.id}`} onPress={() => setPlanId(plan.id)} accessibilityRole="button" accessibilityState={{ selected: on }} style={[styles.plan, on && styles.planOn]}>
              <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={22} color={on ? colors.accent : '#7C8DA3'} />
              <View style={{ flex: 1 }}>
                <Text style={styles.planLabel}>{plan.label}</Text>
                <Text style={styles.planNote}>{plan.note}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                {plan.badge ? <Text style={styles.planBadge}>{plan.badge}</Text> : null}
                <Text style={styles.planPrice}>{plan.price}<Text style={styles.planPer}> / {plan.per}</Text></Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <Button testID="purchase" label="Start 7-day free trial" variant="accent" loading={busy} onPress={buy} />
        <Text style={styles.fine}>
          {BILLING_LIVE
            ? 'Free for 7 days, then billed as selected. Cancel anytime in your store account settings.'
            : 'Demo checkout: store billing isn’t connected in this build, so Pro unlocks without a charge.'}
        </Text>
        <Pressable onPress={restorePurchase} accessibilityRole="button"><Text style={styles.restore}>Restore purchase</Text></Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.primary },
  close: { alignSelf: 'flex-end', padding: 14 },
  body: { paddingHorizontal: 22, paddingBottom: 20 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: colors.accent, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  title: { fontSize: 28, fontWeight: '800', color: '#fff', marginTop: 14, lineHeight: 34 },
  lead: { fontSize: 15, color: '#C5D2E0', marginTop: 8, marginBottom: 22, lineHeight: 21 },
  feature: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  featureIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  featureTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  featureText: { fontSize: 13, color: '#C5D2E0', marginTop: 1 },
  plan: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 2, borderColor: 'rgba(255,255,255,0.18)', borderRadius: radius.lg, padding: 14, marginBottom: 10 },
  planOn: { borderColor: colors.accent, backgroundColor: 'rgba(242,107,33,0.12)' },
  planLabel: { fontSize: 16, fontWeight: '700', color: '#fff' },
  planNote: { fontSize: 12, color: '#C5D2E0', marginTop: 2 },
  planBadge: { fontSize: 10, fontWeight: '800', color: colors.accent, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 2 },
  planPrice: { fontSize: 17, fontWeight: '800', color: '#fff' },
  planPer: { fontSize: 12, fontWeight: '500', color: '#C5D2E0' },
  footer: { paddingHorizontal: 22, paddingBottom: 12 },
  fine: { fontSize: 12, color: '#C5D2E0', textAlign: 'center', marginTop: 10, lineHeight: 17 },
  restore: { fontSize: 13, fontWeight: '600', color: '#fff', textAlign: 'center', paddingVertical: 12, textDecorationLine: 'underline' },
});
