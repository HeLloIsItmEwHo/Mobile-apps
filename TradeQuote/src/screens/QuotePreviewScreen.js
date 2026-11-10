import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import HtmlPreview from '../components/HtmlPreview';
import { Button, Chip, Header, STATUS } from '../components/ui';
import { shareQuotePdf } from '../services/exportQuote';
import { buildQuoteHtml } from '../services/quoteHtml';
import { colors } from '../theme';
import { confirm, notify } from '../utils/dialogs';

export default function QuotePreviewScreen({ profile, quote, isPro, onBack, onEdit, onStatus, onDuplicate, onDelete }) {
  const [busy, setBusy] = useState(false);
  const html = useMemo(() => buildQuoteHtml(profile, quote, { pro: isPro }), [profile, quote, isPro]);

  const send = async () => {
    setBusy(true);
    try {
      const name = `${quote.number} - ${quote.customer.name || 'Quote'}`.replace(/[^\w\- ]+/g, '');
      await shareQuotePdf(html, name);
      if (quote.status === 'draft') onStatus('sent');
    } catch (error) {
      notify('Couldn’t create the PDF', String(error?.message || error));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (await confirm('Delete this quote?', `${quote.number} will be removed for good.`, 'Delete', true)) onDelete();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Header
        title={quote.number}
        subtitle={quote.customer.name}
        onBack={onBack}
        right={
          <View style={styles.actions}>
            <IconButton icon="copy-outline" label="Duplicate quote" onPress={onDuplicate} />
            <IconButton icon="trash-outline" label="Delete quote" onPress={remove} />
          </View>
        }
      />
      <View style={styles.statusRow}>
        {Object.keys(STATUS).map((status) => (
          <Chip
            key={status}
            testID={`status-${status}`}
            label={STATUS[status].label}
            selected={quote.status === status}
            color={STATUS[status].fg}
            onPress={() => onStatus(status)}
          />
        ))}
      </View>
      <View style={styles.paper}>
        <HtmlPreview html={html} style={styles.web} />
      </View>
      <View style={styles.footer}>
        <Button label="Edit" icon="create-outline" variant="ghost" onPress={onEdit} style={{ flex: 1 }} />
        <Button testID="send-pdf" label="Send PDF" icon="share-outline" variant="accent" loading={busy} onPress={send} style={{ flex: 1.6 }} />
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
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingBottom: 12 },
  paper: { flex: 1, marginHorizontal: 12, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: colors.line, backgroundColor: '#fff' },
  web: { flex: 1, backgroundColor: '#fff' },
  footer: { flexDirection: 'row', gap: 10, padding: 16 },
});
