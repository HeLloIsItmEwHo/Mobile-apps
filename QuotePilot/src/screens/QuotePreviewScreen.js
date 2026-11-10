import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import HtmlPreview from '../components/HtmlPreview';
import { Button, Chip, Header, STATUS } from '../components/ui';
import { shareQuotePdf } from '../services/exportQuote';
import { buildQuoteHtml, formatDate, validUntil } from '../services/quoteHtml';
import { colors, radius } from '../theme';
import { confirm, notify } from '../utils/dialogs';
import { computeTotals, formatMoney, needsFollowUp } from '../utils/money';
import { shareText } from '../utils/share';

export default function QuotePreviewScreen({ profile, quote, isPro, onBack, onEdit, onStatus, onDuplicate, onDelete, onCreateInvoice, onInvoiceChange }) {
  const [busy, setBusy] = useState(false);
  const [doc, setDoc] = useState(quote.invoice ? 'invoice' : 'quote');
  const showInvoice = doc === 'invoice' && Boolean(quote.invoice);
  const html = useMemo(() => buildQuoteHtml(profile, quote, { pro: isPro, mode: showInvoice ? 'invoice' : 'quote' }), [profile, quote, isPro, showInvoice]);
  const totals = computeTotals(quote);
  const cur = profile.currency || '$';

  const send = async () => {
    setBusy(true);
    try {
      const number = showInvoice ? quote.invoice.number : quote.number;
      await shareQuotePdf(html, `${number} - ${quote.customer.name || 'Customer'}`.replace(/[^\w\- ]+/g, ''));
      if (!showInvoice && quote.status === 'draft') onStatus('sent');
    } catch (error) {
      notify('Couldn’t create the PDF', String(error?.message || error));
    } finally {
      setBusy(false);
    }
  };

  const followUp = () => {
    const first = (quote.customer.name || '').trim().split(/\s+/)[0];
    const signoff = [profile.ownerName, profile.businessName].filter(Boolean).join(', ');
    shareText(
      `Hi${first ? ` ${first}` : ''}, just checking in on the quote I sent over for ${quote.title.toLowerCase()} (${quote.number}, ${formatMoney(totals.total, cur)}). ` +
        `It’s valid until ${formatDate(validUntil(quote))}. Happy to answer any questions or adjust anything — just let me know and we can get you booked in.\n\n${signoff}${profile.phone ? `\n${profile.phone}` : ''}`
    );
  };

  const createInvoice = () => {
    if (onCreateInvoice()) setDoc('invoice');
  };

  const remove = async () => {
    if (await confirm('Delete this quote?', `${quote.number}${quote.invoice ? ` and invoice ${quote.invoice.number}` : ''} will be removed for good.`, 'Delete', true)) onDelete();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Header
        title={showInvoice ? quote.invoice.number : quote.number}
        subtitle={quote.customer.name}
        onBack={onBack}
        right={
          <View style={styles.actions}>
            <IconButton icon="copy-outline" label="Duplicate quote" onPress={onDuplicate} />
            <IconButton icon="trash-outline" label="Delete quote" onPress={remove} />
          </View>
        }
      />

      {quote.invoice ? (
        <View style={styles.tabs}>
          {[['quote', 'Quote'], ['invoice', 'Invoice']].map(([id, label]) => (
            <Pressable key={id} testID={`doc-${id}`} onPress={() => setDoc(id)} accessibilityRole="button" accessibilityState={{ selected: doc === id }} style={[styles.tab, doc === id && styles.tabOn]}>
              <Text style={[styles.tabText, doc === id && styles.tabTextOn]}>{label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {showInvoice ? (
        <View style={styles.statusRow}>
          {totals.deposit > 0 ? (
            <Chip
              testID="deposit-paid"
              label={`Deposit received (${formatMoney(totals.deposit, cur)})`}
              icon={quote.invoice.depositPaid ? 'checkmark' : undefined}
              selected={quote.invoice.depositPaid}
              onPress={() => onInvoiceChange({ depositPaid: !quote.invoice.depositPaid })}
            />
          ) : null}
          <Chip
            testID="mark-paid"
            label={quote.invoice.paidAt ? `Paid ${formatDate(quote.invoice.paidAt)}` : 'Mark as paid'}
            icon={quote.invoice.paidAt ? 'checkmark' : undefined}
            color={colors.success}
            selected={Boolean(quote.invoice.paidAt)}
            onPress={() => onInvoiceChange({ paidAt: quote.invoice.paidAt ? null : new Date().toISOString() })}
          />
        </View>
      ) : (
        <View style={styles.statusRow}>
          {Object.keys(STATUS).map((status) => (
            <Chip key={status} testID={`status-${status}`} label={STATUS[status].label} selected={quote.status === status} color={STATUS[status].fg} onPress={() => onStatus(status)} />
          ))}
        </View>
      )}

      {!showInvoice && quote.status === 'sent' ? (
        <Pressable testID="follow-up" onPress={followUp} style={[styles.nudge, needsFollowUp(quote) && styles.nudgeDue]} accessibilityRole="button">
          <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.info} />
          <Text style={styles.nudgeText}>{needsFollowUp(quote) ? 'No reply yet — send a follow-up message' : 'Send a follow-up message'}</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.info} />
        </Pressable>
      ) : null}
      {!quote.invoice && quote.status === 'accepted' ? (
        <Pressable testID="create-invoice" onPress={createInvoice} style={[styles.nudge, styles.nudgeWon]} accessibilityRole="button">
          <Ionicons name="receipt-outline" size={18} color={colors.success} />
          <Text style={styles.nudgeText}>Job won — create the invoice</Text>
          {!isPro ? <Text style={styles.proTag}>PRO</Text> : null}
          <Ionicons name="chevron-forward" size={16} color={colors.success} />
        </Pressable>
      ) : null}

      <View style={styles.paper}>
        <HtmlPreview html={html} style={styles.web} />
      </View>
      <View style={styles.footer}>
        <Button label="Edit" icon="create-outline" variant="ghost" onPress={onEdit} style={{ flex: 1 }} />
        <Button testID="send-pdf" label={showInvoice ? 'Send invoice' : 'Send quote'} icon="share-outline" variant="accent" loading={busy} onPress={send} style={{ flex: 1.6 }} />
      </View>
    </SafeAreaView>
  );
}

function IconButton({ icon, label, onPress }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} accessibilityRole="button" accessibilityLabel={label} style={styles.iconBtn}>
      <Ionicons name={icon} size={21} color={colors.ink} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  actions: { flexDirection: 'row', gap: 4 },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  tabs: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 12, backgroundColor: '#E7EBF0', borderRadius: radius.md, padding: 3 },
  tab: { flex: 1, minHeight: 38, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md - 2 },
  tabOn: { backgroundColor: '#fff' },
  tabText: { fontSize: 14, fontWeight: '700', color: colors.sub },
  tabTextOn: { color: colors.ink },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingBottom: 12 },
  nudge: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginBottom: 12, padding: 12, borderRadius: radius.md, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line },
  nudgeDue: { backgroundColor: colors.infoSoft, borderColor: colors.infoSoft },
  nudgeWon: { backgroundColor: colors.successSoft, borderColor: colors.successSoft },
  nudgeText: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.ink },
  proTag: { fontSize: 10, fontWeight: '800', color: '#fff', backgroundColor: colors.accent, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, overflow: 'hidden' },
  paper: { flex: 1, marginHorizontal: 12, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: colors.line, backgroundColor: '#fff' },
  web: { flex: 1, backgroundColor: '#fff' },
  footer: { flexDirection: 'row', gap: 10, padding: 16 },
});
