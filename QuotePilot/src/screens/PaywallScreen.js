import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '../components/ui';
import { FREE_QUOTES_PER_MONTH, PLANS, PRO_FEATURES, TRIAL_DAYS } from '../services/billing';
import { colors, radius } from '../theme';
import { notify } from '../utils/dialogs';

const REASONS = {
  limit: `You’ve used your ${FREE_QUOTES_PER_MONTH} free quotes this month. Go Pro to keep quoting.`,
  invoice: 'Invoices are part of Pro. Turn won jobs into invoices and track who has paid.',
  duplicate: 'Duplicating quotes is part of Pro. Re-quote repeat jobs in seconds.',
};

// Payment happens on Stripe's checkout page in the browser. The subscription
// is recorded by the server, so Pro appears here once the app checks back in.
export default function PaywallScreen({ reason, plan, onClose, onCheckout, onRefresh }) {
  const [planId, setPlanId] = useState('annual');
  const [busy, setBusy] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const trial = !plan || plan.trialAvailable !== false;

  // Close by itself as soon as the account becomes Pro.
  useEffect(() => {
    if (plan && plan.pro) onClose();
  }, [plan, onClose]);

  const buy = async () => {
    setBusy(true);
    try {
      await onCheckout(planId);
      setWaiting(true);
    } catch (error) {
      notify('Couldn’t start checkout', error.message);
    } finally {
      setBusy(false);
    }
  };

  const check = async () => {
    setBusy(true);
    const latest = await onRefresh();
    setBusy(false);
    if (!latest) notify('Couldn’t check your subscription', 'Check your connection and try again.');
    else if (!latest.pro) notify('No subscription yet', 'We can’t see a Pro subscription on this account yet. If you just paid, give it a few seconds and check again.');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Pressable onPress={onClose} hitSlop={12} style={styles.close} accessibilityRole="button" accessibilityLabel="Close">
        <Ionicons name="close" size={26} color="#fff" />
      </Pressable>
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.badge}><Ionicons name="star" size={14} color="#fff" /><Text style={styles.badgeText}>QUOTEPILOT PRO</Text></View>
        <Text style={styles.title}>Win more jobs with quotes that look the part</Text>
        <Text style={styles.lead}>{REASONS[reason] || 'Faster quotes, better-looking paperwork and invoices that get paid.'}</Text>

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
        {PLANS.map((option) => {
          const on = option.id === planId;
          return (
            <Pressable key={option.id} testID={`plan-${option.id}`} onPress={() => setPlanId(option.id)} accessibilityRole="button" accessibilityState={{ selected: on }} style={[styles.plan, on && styles.planOn]}>
              <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={22} color={on ? colors.accent : '#7C8DA3'} />
              <View style={{ flex: 1 }}>
                <Text style={styles.planLabel}>{option.label}</Text>
                <Text style={styles.planNote}>{option.note}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                {option.badge ? <Text style={styles.planBadge}>{option.badge}</Text> : null}
                <Text style={styles.planPrice}>{option.price}<Text style={styles.planPer}> / {option.per}</Text></Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        {waiting ? (
          <>
            <Text style={styles.waiting}>Finish checkout in your browser. Pro unlocks here as soon as it’s done.</Text>
            <Button testID="check-subscription" label="I’ve finished — check now" variant="accent" loading={busy} onPress={check} />
            <Pressable onPress={buy} accessibilityRole="button"><Text style={styles.restore}>Open checkout again</Text></Pressable>
          </>
        ) : (
          <>
            <Button testID="purchase" label={trial ? `Start ${TRIAL_DAYS}-day free trial` : 'Subscribe'} variant="accent" loading={busy} onPress={buy} />
            <Text style={styles.fine}>
              {trial ? `Free for ${TRIAL_DAYS} days, then billed as selected. ` : ''}Secure checkout by Stripe. Cancel anytime from Settings.
            </Text>
            <Pressable testID="check-subscription" onPress={check} accessibilityRole="button"><Text style={styles.restore}>Already subscribed? Refresh</Text></Pressable>
          </>
        )}
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
  waiting: { fontSize: 14, color: '#fff', textAlign: 'center', marginBottom: 12, lineHeight: 20 },
  fine: { fontSize: 12, color: '#C5D2E0', textAlign: 'center', marginTop: 10, lineHeight: 17 },
  restore: { fontSize: 13, fontWeight: '600', color: '#fff', textAlign: 'center', paddingVertical: 12, textDecorationLine: 'underline' },
});
