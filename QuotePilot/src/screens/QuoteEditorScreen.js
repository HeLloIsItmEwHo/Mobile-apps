import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Button, Card, Chip, Field, Header, SectionTitle } from '../components/ui';
import { getOfferedServices } from '../data/trades';
import { generateDraft, makeItem } from '../services/quoteGenerator';
import { colors, radius } from '../theme';
import { confirm, notify } from '../utils/dialogs';
import { computeTotals, formatMoney, lineTotal, num, round2 } from '../utils/money';

const TYPE_META = {
  labor: { label: 'Labor', icon: 'time-outline', color: colors.info },
  material: { label: 'Material', icon: 'cube-outline', color: colors.accent },
  fee: { label: 'Fee', icon: 'pricetag-outline', color: colors.sub },
};

export default function QuoteEditorScreen({ profile, initialQuote, isNew, customers = [], onSave, onCancel }) {
  const [quote, setQuote] = useState(initialQuote);
  const [pickedIds, setPickedIds] = useState([]);
  const [emergency, setEmergency] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [generatedNote, setGeneratedNote] = useState(null);

  const offered = useMemo(() => getOfferedServices(profile), [profile]);
  const totals = computeTotals(quote);
  const cur = profile.currency || '$';

  const set = (patch) => {
    setDirty(true);
    setQuote((current) => ({ ...current, ...patch }));
  };
  const setCustomer = (patch) => set({ customer: { ...quote.customer, ...patch } });
  const setItem = (id, patch) => set({ items: quote.items.map((item) => (item.id === id ? { ...item, ...patch } : item)) });
  // Typing what a material costs you prices it with your markup; the price
  // can still be overridden afterwards.
  const setCost = (id, cost) =>
    setItem(id, cost.trim() === '' ? { cost } : { cost, unitPrice: String(round2(num(cost) * (1 + num(profile.markupPct) / 100))) });
  const removeItem = (id) => set({ items: quote.items.filter((item) => item.id !== id) });
  const addItem = (type) =>
    set({ items: [...quote.items, makeItem(type, '', 1, type === 'labor' ? num(profile.hourlyRate) : 0)] });

  const generate = async () => {
    if (!quote.description.trim() && pickedIds.length === 0) {
      notify('Describe the job first', 'Type a sentence about the work, or tap one of your services.');
      return;
    }
    if (quote.items.length > 0) {
      const ok = await confirm('Replace current line items?', 'Generating again will overwrite the items, scope and message on this quote.', 'Replace');
      if (!ok) return;
    }
    // Catch "after hours" / "emergency" in the description so the surcharge isn't forgotten.
    const urgent = emergency || (profile.emergency && /\b(emergency|urgent|after[- ]hours|weekend|same[- ]day)\b/i.test(quote.description));
    if (urgent !== emergency) setEmergency(urgent);
    const draft = generateDraft(profile, { description: quote.description, pickedIds, emergency: urgent, customerName: quote.customer.name });
    set({ title: draft.title, intro: draft.intro, scope: draft.scope, items: draft.items });
    setGeneratedNote(
      draft.matched
        ? `Built from ${draft.matched} of your services at ${formatMoney(profile.hourlyRate, cur)}/hr. Check hours and material prices before sending.`
        : 'We couldn’t match that to one of your services, so here’s a blank template priced at your rate. Fill in the hours and materials.'
    );
  };

  const cancel = async () => {
    if (dirty && !(await confirm('Discard changes?', 'Your edits to this quote won’t be saved.', 'Discard', true))) return;
    onCancel();
  };

  const save = () => {
    if (!quote.customer.name.trim()) {
      notify('Who is this quote for?', 'Add the customer’s name.');
      return;
    }
    if (!quote.items.some((item) => !item.optional && lineTotal(item) > 0)) {
      notify('Nothing to quote yet', 'Generate the quote or add at least one priced line item.');
      return;
    }
    onSave({ ...quote, title: quote.title.trim() || 'Quote', updatedAt: new Date().toISOString() });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Header title={isNew ? 'New quote' : 'Edit quote'} subtitle={quote.number} onBack={cancel} />
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <SectionTitle>Customer</SectionTitle>
          <Card>
            {isNew && customers.length > 0 && !quote.customer.name ? (
              <View style={{ marginBottom: 12 }}>
                <Text style={styles.smallLabel}>Recent customers</Text>
                <View style={styles.chips}>
                  {customers.slice(0, 6).map((customer) => (
                    <Chip key={customer.name} label={customer.name} icon="person-outline" onPress={() => setCustomer(customer)} />
                  ))}
                </View>
              </View>
            ) : null}
            <Field label="Name" placeholder="Customer or company name" value={quote.customer.name} onChangeText={(name) => setCustomer({ name })} />
            <Field label="Job address" placeholder="Optional" value={quote.customer.address} onChangeText={(address) => setCustomer({ address })} />
            <View style={styles.row}>
              <Field style={styles.flexNoMargin} label="Phone" placeholder="Optional" keyboardType="phone-pad" value={quote.customer.phone} onChangeText={(phone) => setCustomer({ phone })} />
              <Field style={styles.flexNoMargin} label="Email" placeholder="Optional" keyboardType="email-address" autoCapitalize="none" value={quote.customer.email} onChangeText={(email) => setCustomer({ email })} />
            </View>
          </Card>

          <SectionTitle>The job</SectionTitle>
          <Card>
            <Field
              label="Describe the job in your own words"
              placeholder={offered[0] ? `e.g. ${offered[0].name.toLowerCase()} at the customer's home…` : 'What needs doing?'}
              multiline
              value={quote.description}
              onChangeText={(description) => set({ description })}
            />
            {offered.length > 0 && (
              <>
                <Text style={styles.smallLabel}>Or tap what’s involved</Text>
                <View style={styles.chips}>
                  {offered.map((service) => (
                    <Chip
                      key={service.id}
                      label={service.name}
                      selected={pickedIds.includes(service.id)}
                      onPress={() => setPickedIds(pickedIds.includes(service.id) ? pickedIds.filter((id) => id !== service.id) : [...pickedIds, service.id])}
                    />
                  ))}
                </View>
              </>
            )}
            {profile.emergency && (
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Emergency / after-hours (+{num(profile.emergencyPct)}% labor)</Text>
                <Switch value={emergency} onValueChange={setEmergency} trackColor={{ true: colors.accent }} />
              </View>
            )}
            <Button testID="generate" label={quote.items.length ? 'Regenerate quote' : 'Generate quote'} icon="sparkles" variant="accent" onPress={generate} style={{ marginTop: 14 }} />
            {generatedNote ? (
              <View style={styles.note}>
                <Ionicons name="information-circle" size={18} color={colors.info} />
                <Text style={styles.noteText}>{generatedNote}</Text>
              </View>
            ) : null}
          </Card>

          <SectionTitle>Line items</SectionTitle>
          {quote.items.length === 0 ? (
            <Card><Text style={styles.empty}>No items yet. Generate the quote above, or add lines yourself.</Text></Card>
          ) : (
            <>
              <Field label="Job title" placeholder="Shown at the top of the quote" value={quote.title} onChangeText={(title) => set({ title })} />
              {quote.items.map((item) => {
                const meta = TYPE_META[item.type];
                return (
                  <Card key={item.id} style={styles.item}>
                    <View style={styles.itemHead}>
                      <View style={[styles.typeTag, { backgroundColor: `${meta.color}1A` }]}>
                        <Ionicons name={meta.icon} size={13} color={meta.color} />
                        <Text style={[styles.typeText, { color: meta.color }]}>{meta.label}</Text>
                      </View>
                      {item.optional ? <Text style={styles.optionalTag}>Optional</Text> : null}
                      <Text style={[styles.itemTotal, item.optional && { color: colors.sub }]}>{item.optional ? '+ ' : ''}{formatMoney(lineTotal(item), cur)}</Text>
                      <Pressable onPress={() => removeItem(item.id)} hitSlop={10} accessibilityRole="button" accessibilityLabel={`Remove ${item.description || meta.label}`}>
                        <Ionicons name="trash-outline" size={19} color={colors.faint} />
                      </Pressable>
                    </View>
                    <TextInput
                      accessibilityLabel="Item description"
                      style={styles.itemDesc}
                      placeholder="Description"
                      placeholderTextColor={colors.faint}
                      multiline
                      value={item.description}
                      onChangeText={(description) => setItem(item.id, { description })}
                    />
                    <View style={styles.row}>
                      <Field style={styles.flexNoMargin} label={item.type === 'labor' ? 'Hours' : 'Qty'} keyboardType="decimal-pad" value={item.qty} onChangeText={(qty) => setItem(item.id, { qty })} selectTextOnFocus />
                      {item.type === 'material' ? (
                        <Field style={styles.flexNoMargin} label="Your cost" prefix={cur} placeholder="—" keyboardType="decimal-pad" value={item.cost || ''} onChangeText={(cost) => setCost(item.id, cost)} selectTextOnFocus />
                      ) : null}
                      <Field style={styles.flexNoMargin} label={item.type === 'labor' ? 'Rate' : 'Price each'} prefix={cur} keyboardType="decimal-pad" value={item.unitPrice} onChangeText={(unitPrice) => setItem(item.id, { unitPrice })} selectTextOnFocus />
                    </View>
                    <View style={styles.optionalRow}>
                      <Text style={styles.optionalLabel}>Offer as an optional upgrade</Text>
                      <Switch
                        accessibilityLabel={`Offer ${item.description || meta.label} as an optional upgrade`}
                        value={Boolean(item.optional)}
                        onValueChange={(optional) => setItem(item.id, { optional })}
                        trackColor={{ true: colors.primary }}
                      />
                    </View>
                  </Card>
                );
              })}
            </>
          )}
          <View style={[styles.row, { marginTop: 10 }]}>
            <Button style={styles.addBtn} variant="soft" icon="add" label="Labor" onPress={() => addItem('labor')} />
            <Button style={styles.addBtn} variant="soft" icon="add" label="Material" onPress={() => addItem('material')} />
            <Button style={styles.addBtn} variant="soft" icon="add" label="Fee" onPress={() => addItem('fee')} />
          </View>

          <SectionTitle>Totals</SectionTitle>
          <Card>
            <View style={styles.row}>
              <Field style={styles.flexNoMargin} label="Discount" suffix="%" keyboardType="decimal-pad" value={quote.discountPct} onChangeText={(discountPct) => set({ discountPct })} selectTextOnFocus />
              <Field style={styles.flexNoMargin} label={profile.taxLabel || 'Tax'} suffix="%" keyboardType="decimal-pad" value={quote.taxRate} onChangeText={(taxRate) => set({ taxRate })} selectTextOnFocus />
              <Field style={styles.flexNoMargin} label="Deposit" suffix="%" keyboardType="decimal-pad" value={quote.depositPct} onChangeText={(depositPct) => set({ depositPct })} selectTextOnFocus />
            </View>
            <View style={styles.sumBlock}>
              <SumRow label="Labor" value={formatMoney(totals.byType.labor, cur)} />
              <SumRow label="Materials" value={formatMoney(totals.byType.material, cur)} />
              {totals.byType.fee > 0 && <SumRow label="Other charges" value={formatMoney(totals.byType.fee, cur)} />}
              {totals.discount > 0 && <SumRow label="Discount" value={`-${formatMoney(totals.discount, cur)}`} />}
              {totals.tax > 0 && <SumRow label={profile.taxLabel || 'Tax'} value={formatMoney(totals.tax, cur)} />}
              <SumRow label="Total" value={formatMoney(totals.total, cur)} bold />
              {totals.deposit > 0 && <SumRow label="Deposit to book" value={formatMoney(totals.deposit, cur)} />}
              {totals.optionalTotal > 0 && <SumRow label="Optional upgrades offered" value={`+ ${formatMoney(totals.optionalTotal, cur)}`} />}
            </View>
            <View style={styles.owner}>
              <View style={styles.ownerHead}>
                <Ionicons name="eye-off-outline" size={15} color={colors.success} />
                <Text style={styles.ownerTitle}>Your numbers — never shown to the customer</Text>
              </View>
              <SumRow label="Materials cost you" value={formatMoney(totals.materialsCost, cur)} />
              <SumRow label="You keep after materials" value={`${formatMoney(totals.profit, cur)}  ·  ${totals.margin}%`} />
            </View>
          </Card>

          <SectionTitle>Wording</SectionTitle>
          <Card>
            <Field label="Message to customer" multiline value={quote.intro} onChangeText={(intro) => set({ intro })} />
            <Field label="Scope of work" multiline inputStyle={{ minHeight: 110 }} value={quote.scope} onChangeText={(scope) => set({ scope })} hint="One line per bullet point." />
            <Field label="Notes for this job" placeholder="Access, scheduling, customer-supplied items…" multiline inputStyle={{ minHeight: 60 }} value={quote.notes} onChangeText={(notes) => set({ notes })} />
            <Field label="Payment terms" multiline inputStyle={{ minHeight: 50 }} value={quote.paymentTerms} onChangeText={(paymentTerms) => set({ paymentTerms })} />
            <Field label="Warranty" multiline inputStyle={{ minHeight: 60 }} value={quote.warranty} onChangeText={(warranty) => set({ warranty })} />
            <Field label="Not included" multiline value={quote.exclusions} onChangeText={(exclusions) => set({ exclusions })} hint="One line per bullet point." />
            <Field style={{ marginBottom: 0 }} label="Valid for" suffix="days" keyboardType="number-pad" value={quote.validDays} onChangeText={(validDays) => set({ validDays })} />
          </Card>
        </ScrollView>

        <View style={styles.footer}>
          <View>
            <Text style={styles.footLabel}>Quote total</Text>
            <Text style={styles.footTotal} testID="editor-total">{formatMoney(totals.total, cur)}</Text>
          </View>
          <Button testID="save-quote" label="Save & preview" icon="document-text-outline" onPress={save} style={{ flex: 1, marginLeft: 16 }} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SumRow({ label, value, bold }) {
  return (
    <View style={[styles.sumRow, bold && styles.sumRowBold]}>
      <Text style={[styles.sumLabel, bold && styles.sumBoldText]}>{label}</Text>
      <Text style={[styles.sumValue, bold && styles.sumBoldText]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  body: { paddingHorizontal: 16, paddingBottom: 32 },
  row: { flexDirection: 'row', gap: 10 },
  flexNoMargin: { flex: 1, marginBottom: 0 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  smallLabel: { fontSize: 13, fontWeight: '600', color: colors.sub, marginBottom: 8 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 14 },
  switchLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.ink },
  note: { flexDirection: 'row', gap: 8, backgroundColor: colors.infoSoft, borderRadius: radius.sm, padding: 10, marginTop: 12 },
  noteText: { flex: 1, fontSize: 13, color: colors.ink, lineHeight: 18 },
  empty: { fontSize: 14, color: colors.sub, textAlign: 'center', paddingVertical: 8 },
  item: { marginBottom: 8, padding: 12 },
  itemHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  typeTag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  typeText: { fontSize: 12, fontWeight: '700' },
  itemTotal: { flex: 1, textAlign: 'right', fontSize: 15, fontWeight: '700', color: colors.ink },
  itemDesc: { fontSize: 15, fontWeight: '600', color: colors.ink, paddingVertical: 8, minHeight: 40 },
  addBtn: { flex: 1, minHeight: 44, paddingHorizontal: 8 },
  optionalTag: { fontSize: 11, fontWeight: '700', color: colors.primary, backgroundColor: colors.primarySoft, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, overflow: 'hidden' },
  optionalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  optionalLabel: { fontSize: 13, color: colors.sub, fontWeight: '600' },
  owner: { marginTop: 12, backgroundColor: colors.successSoft, borderRadius: radius.sm, padding: 12 },
  ownerHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  ownerTitle: { fontSize: 12, fontWeight: '700', color: colors.success },
  sumBlock: { marginTop: 14, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 8 },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  sumRowBold: { borderTopWidth: 1, borderTopColor: colors.line, marginTop: 6, paddingTop: 10 },
  sumLabel: { fontSize: 14, color: colors.sub },
  sumValue: { fontSize: 14, color: colors.ink, fontWeight: '600' },
  sumBoldText: { fontSize: 18, fontWeight: '800', color: colors.ink },
  footer: { flexDirection: 'row', alignItems: 'center', padding: 16, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: '#fff' },
  footLabel: { fontSize: 12, color: colors.sub },
  footTotal: { fontSize: 22, fontWeight: '800', color: colors.ink },
});
