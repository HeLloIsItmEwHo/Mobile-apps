import React, { useMemo, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { Button, Chip, Field } from '../components/ui';
import { TRADES, getTrade } from '../data/trades';
import { BRAND_COLORS, colors, radius } from '../theme';
import { notify } from '../utils/dialogs';
import { num } from '../utils/money';

// The answers here drive every generated quote: which job templates are
// offered, how labor and materials are priced, and the wording, terms and
// branding on the document.

const STEPS = ['Your trade', 'Your services', 'Your pricing', 'Your business', 'Your quotes'];

const PAYMENT_TERMS = [
  'Balance due on completion.',
  'Balance due within 15 days of completion.',
  'Balance due within 30 days of invoice.',
  'Progress payments as agreed; final balance due on completion.',
];

const TONES = [
  ['friendly', 'Friendly', '“Hi Sam, thanks for reaching out!”'],
  ['direct', 'Straight to the point', '“Thank you for the opportunity to quote.”'],
  ['formal', 'Formal', '“We are pleased to submit the following quotation.”'],
];

export const DEFAULT_PROFILE = {
  trade: '',
  otherTrade: '',
  services: [],
  customServices: [],
  clientType: 'residential',
  emergency: false,
  emergencyPct: '50',
  hourlyRate: '',
  tripFee: '',
  markupPct: '20',
  taxRate: '0',
  taxLabel: 'Sales tax',
  currency: '$',
  businessName: '',
  ownerName: '',
  phone: '',
  email: '',
  address: '',
  license: '',
  insured: true,
  years: '',
  logo: null,
  depositPct: '30',
  validDays: '30',
  paymentTerms: PAYMENT_TERMS[0],
  warranty: '',
  brandColor: BRAND_COLORS[0],
  tone: 'friendly',
  nextNumber: 1001,
  invoiceDueDays: '14',
  nextInvoice: 1001,
};

const MAX_LOGO_BASE64 = 900000; // ~650 KB image; keeps device storage happy

export default function SetupScreen({ initialProfile, isPro, onDone, onCancel, onUpgrade }) {
  const editing = Boolean(initialProfile);
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState({ ...DEFAULT_PROFILE, ...(initialProfile || {}) });
  const [customService, setCustomService] = useState('');

  const set = (patch) => setProfile((current) => ({ ...current, ...patch }));
  const trade = useMemo(() => getTrade(profile.trade), [profile.trade]);

  const chooseTrade = (id) => {
    if (id === profile.trade) return;
    const next = getTrade(id);
    // Pre-select the whole menu and the trade's usual warranty; most owners
    // only need to untick a couple.
    set({ trade: id, services: next.services.map((service) => service.id), warranty: next.warranty });
  };

  const toggleService = (id) =>
    set({ services: profile.services.includes(id) ? profile.services.filter((x) => x !== id) : [...profile.services, id] });

  const addCustomService = () => {
    const name = customService.trim();
    if (!name) return;
    if (!profile.customServices.some((existing) => existing.toLowerCase() === name.toLowerCase())) {
      set({ customServices: [...profile.customServices, name] });
    }
    setCustomService('');
  };

  const pickLogo = async () => {
    if (!isPro) {
      onUpgrade();
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.5, base64: true });
    if (result.canceled || !result.assets?.[0]?.base64) return;
    const asset = result.assets[0];
    if (asset.base64.length > MAX_LOGO_BASE64) {
      notify('Logo is too large', 'Please choose a smaller image (under about 600 KB) or crop it tighter.');
      return;
    }
    set({ logo: `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}` });
  };

  const validate = () => {
    if (step === 0) {
      if (!profile.trade) return 'Pick the trade that best describes your work.';
      if (profile.trade === 'other' && !profile.otherTrade.trim()) return 'Tell us what your trade is.';
    }
    if (step === 1 && profile.services.length + profile.customServices.length === 0) {
      return 'Add at least one service you offer so quotes can be built around it.';
    }
    if (step === 2 && num(profile.hourlyRate) <= 0) return 'Enter your hourly labor rate — it prices every quote.';
    if (step === 3 && !profile.businessName.trim()) return 'Enter your business name — it goes at the top of every quote.';
    return null;
  };

  const next = () => {
    const problem = validate();
    if (problem) {
      notify('One more thing', problem);
      return;
    }
    if (step < STEPS.length - 1) {
      setStep(step + 1);
      return;
    }
    onDone({
      ...profile,
      businessName: profile.businessName.trim(),
      otherTrade: profile.otherTrade.trim(),
      warranty: profile.warranty.trim() || trade.warranty,
    });
  };

  const back = () => (step === 0 ? onCancel && onCancel() : setStep(step - 1));
  const cur = profile.currency;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.top}>
          <View style={styles.topRow}>
            {step > 0 || onCancel ? (
              <Pressable onPress={back} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back">
                <Ionicons name="chevron-back" size={24} color={colors.ink} />
              </Pressable>
            ) : (
              <View style={{ width: 24 }} />
            )}
            <Text style={styles.stepCount}>Step {step + 1} of {STEPS.length}</Text>
            <View style={{ width: 24 }} />
          </View>
          <View style={styles.progress}>
            {STEPS.map((label, index) => (
              <View key={label} style={[styles.progressBar, index <= step && styles.progressBarOn]} />
            ))}
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {step === 0 && (
            <>
              <Text style={styles.title}>{editing ? 'Your trade' : 'What kind of work do you do?'}</Text>
              <Text style={styles.lead}>We’ll tailor job templates, wording and terms to your trade.</Text>
              <View style={styles.tradeGrid}>
                {TRADES.map((item) => {
                  const on = profile.trade === item.id;
                  return (
                    <Pressable
                      key={item.id}
                      testID={`trade-${item.id}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                      onPress={() => chooseTrade(item.id)}
                      style={[styles.tradeTile, on && styles.tradeTileOn]}
                    >
                      <Ionicons name={item.icon} size={26} color={on ? '#fff' : colors.primary} />
                      <Text style={[styles.tradeText, on && { color: '#fff' }]}>{item.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
              {profile.trade === 'other' && (
                <Field label="What’s your trade?" placeholder="e.g. Pest control, Pool service, Locksmith" value={profile.otherTrade} onChangeText={(otherTrade) => set({ otherTrade })} />
              )}
            </>
          )}

          {step === 1 && (
            <>
              <Text style={styles.title}>Which services do you offer?</Text>
              <Text style={styles.lead}>Quotes are built from these. Untick anything you don’t do, and add your own.</Text>
              <View style={styles.chips}>
                {trade.services.map((service) => (
                  <Chip key={service.id} label={service.name} selected={profile.services.includes(service.id)} onPress={() => toggleService(service.id)} />
                ))}
                {profile.customServices.map((name) => (
                  <Chip key={name} label={name} icon="close" selected onPress={() => set({ customServices: profile.customServices.filter((x) => x !== name) })} />
                ))}
              </View>
              <View style={styles.addRow}>
                <Field style={{ flex: 1, marginBottom: 0 }} placeholder="Add another service" value={customService} onChangeText={setCustomService} onSubmitEditing={addCustomService} returnKeyType="done" />
                <Button label="Add" variant="soft" onPress={addCustomService} />
              </View>

              <Text style={styles.question}>Who do you mostly work for?</Text>
              <View style={styles.chips}>
                {[['residential', 'Homeowners'], ['commercial', 'Businesses'], ['both', 'Both']].map(([id, label]) => (
                  <Chip key={id} label={label} selected={profile.clientType === id} onPress={() => set({ clientType: id })} />
                ))}
              </View>

              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.switchLabel}>Emergency / after-hours call-outs</Text>
                  <Text style={styles.switchHint}>Adds a one-tap surcharge option to quotes.</Text>
                </View>
                <Switch value={profile.emergency} onValueChange={(emergency) => set({ emergency })} trackColor={{ true: colors.primary }} />
              </View>
              {profile.emergency && (
                <Field label="Emergency surcharge on labor" suffix="%" keyboardType="decimal-pad" value={profile.emergencyPct} onChangeText={(emergencyPct) => set({ emergencyPct })} />
              )}
            </>
          )}

          {step === 2 && (
            <>
              <Text style={styles.title}>How do you price your work?</Text>
              <Text style={styles.lead}>Every quote is calculated from these numbers. You can still adjust any line on any quote.</Text>
              <Text style={styles.question}>Currency</Text>
              <View style={styles.chips}>
                {['$', '£', '€', 'C$', 'A$'].map((symbol) => (
                  <Chip key={symbol} label={symbol} selected={cur === symbol} onPress={() => set({ currency: symbol })} />
                ))}
              </View>
              <View style={{ height: 14 }} />
              <Field label="Hourly labor rate" prefix={cur} suffix="/ hr" placeholder="95" keyboardType="decimal-pad" value={profile.hourlyRate} onChangeText={(hourlyRate) => set({ hourlyRate })} />
              <Field label="Service call / travel fee" prefix={cur} placeholder="0" keyboardType="decimal-pad" value={profile.tripFee} onChangeText={(tripFee) => set({ tripFee })} hint="Added to each quote automatically. Leave blank if you don’t charge one." />
              <Field label="Markup on materials" suffix="%" keyboardType="decimal-pad" value={profile.markupPct} onChangeText={(markupPct) => set({ markupPct })} hint="Applied to material costs so customers only see your sell price." />
              <View style={styles.rowFields}>
                <Field style={{ flex: 1 }} label="Tax rate" suffix="%" keyboardType="decimal-pad" value={profile.taxRate} onChangeText={(taxRate) => set({ taxRate })} />
                <Field style={{ flex: 1.3 }} label="Tax name" placeholder="Sales tax, VAT, GST" value={profile.taxLabel} onChangeText={(taxLabel) => set({ taxLabel })} />
              </View>
            </>
          )}

          {step === 3 && (
            <>
              <Text style={styles.title}>Tell us about your business</Text>
              <Text style={styles.lead}>This is the letterhead on every quote. Licence and insurance details build trust — and win jobs.</Text>
              <Field label="Business name" placeholder="e.g. Rivera Plumbing Co." value={profile.businessName} onChangeText={(businessName) => set({ businessName })} />
              <Field label="Your name" placeholder="Optional" value={profile.ownerName} onChangeText={(ownerName) => set({ ownerName })} />
              <View style={styles.rowFields}>
                <Field style={{ flex: 1 }} label="Phone" keyboardType="phone-pad" value={profile.phone} onChangeText={(phone) => set({ phone })} />
                <Field style={{ flex: 1.3 }} label="Email" keyboardType="email-address" autoCapitalize="none" value={profile.email} onChangeText={(email) => set({ email })} />
              </View>
              <Field label="Business address" placeholder="Optional" multiline inputStyle={{ minHeight: 56 }} value={profile.address} onChangeText={(address) => set({ address })} />
              <View style={styles.rowFields}>
                <Field style={{ flex: 1.3 }} label="License number" placeholder="Optional" value={profile.license} onChangeText={(license) => set({ license })} />
                <Field style={{ flex: 1 }} label="Years in business" keyboardType="number-pad" value={profile.years} onChangeText={(years) => set({ years })} />
              </View>
              <View style={styles.switchRow}>
                <Text style={[styles.switchLabel, { flex: 1 }]}>We’re fully insured</Text>
                <Switch value={profile.insured} onValueChange={(insured) => set({ insured })} trackColor={{ true: colors.primary }} />
              </View>
            </>
          )}

          {step === 4 && (
            <>
              <Text style={styles.title}>How should your quotes read?</Text>
              <Text style={styles.lead}>Set your standard terms once. They’re filled in on every new quote.</Text>

              <Text style={styles.question}>Tone of voice</Text>
              {TONES.map(([id, label, sample]) => {
                const on = profile.tone === id;
                return (
                  <Pressable key={id} onPress={() => set({ tone: id })} accessibilityRole="button" accessibilityState={{ selected: on }} style={[styles.toneRow, on && styles.toneRowOn]}>
                    <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={20} color={on ? colors.primary : colors.faint} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.switchLabel}>{label}</Text>
                      <Text style={styles.switchHint}>{sample}</Text>
                    </View>
                  </Pressable>
                );
              })}

              <View style={[styles.rowFields, { marginTop: 14 }]}>
                <Field style={{ flex: 1 }} label="Deposit to book" suffix="%" keyboardType="decimal-pad" value={profile.depositPct} onChangeText={(depositPct) => set({ depositPct })} />
                <Field style={{ flex: 1 }} label="Quote valid for" suffix="days" keyboardType="number-pad" value={profile.validDays} onChangeText={(validDays) => set({ validDays })} />
              </View>

              <Field label="Invoices are due within" suffix="days" keyboardType="number-pad" value={profile.invoiceDueDays} onChangeText={(invoiceDueDays) => set({ invoiceDueDays })} />

              <Text style={[styles.question, { marginTop: 8 }]}>Payment terms</Text>
              <View style={styles.chips}>
                {PAYMENT_TERMS.map((terms) => (
                  <Chip key={terms} label={terms.replace(/\.$/, '')} selected={profile.paymentTerms === terms} onPress={() => set({ paymentTerms: terms })} />
                ))}
              </View>
              <View style={{ height: 14 }} />
              <Field label="Your warranty / guarantee" multiline value={profile.warranty} onChangeText={(warranty) => set({ warranty })} hint={`Typical for ${trade.label.toLowerCase()} — edit to match what you actually offer.`} />

              <View style={styles.proBlock}>
                <View style={styles.proHead}>
                  <Text style={styles.question2}>Logo & brand color</Text>
                  {!isPro && (
                    <Pressable onPress={onUpgrade} style={styles.proTag} accessibilityRole="button" accessibilityLabel="Upgrade to Pro">
                      <Ionicons name="star" size={12} color="#fff" />
                      <Text style={styles.proTagText}>PRO</Text>
                    </Pressable>
                  )}
                </View>
                <View style={styles.logoRow}>
                  <Pressable onPress={pickLogo} style={styles.logoBox} accessibilityRole="button" accessibilityLabel="Choose logo">
                    {profile.logo ? <Image source={{ uri: profile.logo }} style={styles.logoImg} resizeMode="contain" /> : <Ionicons name="image-outline" size={26} color={colors.faint} />}
                  </Pressable>
                  <View style={{ flex: 1 }}>
                    <View style={styles.swatches}>
                      {BRAND_COLORS.map((color) => (
                        <Pressable
                          key={color}
                          onPress={() => (isPro ? set({ brandColor: color }) : onUpgrade())}
                          accessibilityRole="button"
                          accessibilityLabel={`Brand color ${color}`}
                          style={[styles.swatch, { backgroundColor: color }, profile.brandColor === color && styles.swatchOn]}
                        />
                      ))}
                    </View>
                    {profile.logo ? (
                      <Pressable onPress={() => set({ logo: null })}><Text style={styles.link}>Remove logo</Text></Pressable>
                    ) : (
                      <Text style={styles.switchHint}>{isPro ? 'Tap the box to add your logo.' : 'Upgrade to put your logo and color on quotes.'}</Text>
                    )}
                  </View>
                </View>
              </View>
            </>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Button
            testID="setup-next"
            label={step < STEPS.length - 1 ? 'Continue' : editing ? 'Save changes' : 'Finish setup'}
            icon={step < STEPS.length - 1 ? undefined : 'checkmark'}
            variant={step < STEPS.length - 1 ? 'primary' : 'accent'}
            onPress={next}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  top: { paddingHorizontal: 20, paddingTop: 8 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 36 },
  stepCount: { fontSize: 13, fontWeight: '600', color: colors.sub },
  progress: { flexDirection: 'row', gap: 6, marginTop: 8 },
  progressBar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.line },
  progressBarOn: { backgroundColor: colors.accent },
  body: { padding: 20, paddingBottom: 32 },
  title: { fontSize: 26, fontWeight: '800', color: colors.ink, lineHeight: 32 },
  lead: { fontSize: 15, color: colors.sub, marginTop: 6, marginBottom: 20, lineHeight: 21 },
  question: { fontSize: 15, fontWeight: '700', color: colors.ink, marginTop: 22, marginBottom: 10 },
  question2: { fontSize: 15, fontWeight: '700', color: colors.ink },
  tradeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  tradeTile: { width: '47.5%', flexGrow: 1, minHeight: 84, borderRadius: radius.lg, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, padding: 14, justifyContent: 'space-between' },
  tradeTileOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  tradeText: { fontSize: 15, fontWeight: '700', color: colors.ink, marginTop: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  addRow: { flexDirection: 'row', gap: 8, marginTop: 14, alignItems: 'center' },
  rowFields: { flexDirection: 'row', gap: 10 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, padding: 14, marginTop: 20, marginBottom: 14 },
  switchLabel: { fontSize: 15, fontWeight: '600', color: colors.ink },
  switchHint: { fontSize: 13, color: colors.sub, marginTop: 2 },
  toneRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, padding: 14, marginBottom: 8 },
  toneRowOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  proBlock: { backgroundColor: '#fff', borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, padding: 14, marginTop: 6 },
  proHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  proTag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.accent, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  proTagText: { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  logoRow: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  logoBox: { width: 72, height: 72, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  logoImg: { width: 70, height: 70 },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  swatch: { width: 30, height: 30, borderRadius: 15, borderWidth: 3, borderColor: '#fff' },
  swatchOn: { borderColor: colors.accent },
  link: { fontSize: 13, fontWeight: '600', color: colors.danger },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.bg },
});
