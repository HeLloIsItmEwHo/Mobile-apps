import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Button, Chip, STATUS, StatusPill } from '../components/ui';
import { tradeLabel } from '../data/trades';
import { FREE_QUOTES_PER_MONTH, freeQuotesLeft } from '../services/billing';
import { formatDate } from '../services/quoteHtml';
import { colors, radius } from '../theme';
import { computeTotals, formatMoney, invoiceDue, needsFollowUp } from '../utils/money';

const FILTERS = ['all', 'draft', 'sent', 'accepted', 'declined', 'unpaid'];
const FILTER_LABELS = { all: 'All', unpaid: 'Unpaid' };

export default function HomeScreen({ profile, quotes, plan, usage, syncState, onNew, onOpen, onSettings, onUpgrade }) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const cur = profile.currency || '$';

  const stats = useMemo(() => {
    const sum = (status) => quotes.filter((q) => q.status === status).reduce((total, q) => total + computeTotals(q).total, 0);
    const won = quotes.filter((q) => q.status === 'accepted').length;
    const lost = quotes.filter((q) => q.status === 'declined').length;
    return {
      pending: sum('sent'),
      won: sum('accepted'),
      unpaid: quotes.reduce((total, q) => total + invoiceDue(q), 0),
      winRate: won + lost ? Math.round((won / (won + lost)) * 100) : null,
      followUps: quotes.filter((q) => needsFollowUp(q)).length,
    };
  }, [quotes]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return [...quotes]
      .filter((q) => (filter === 'all' ? true : filter === 'unpaid' ? invoiceDue(q) > 0 : q.status === filter))
      .filter((q) => !term || [q.customer.name, q.title, q.number, q.invoice?.number, q.customer.address].some((text) => String(text || '').toLowerCase().includes(term)))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [quotes, filter, search]);
  const left = freeQuotesLeft(usage);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.biz} numberOfLines={1}>{profile.businessName}</Text>
          <Text style={styles.trade}>
            {tradeLabel(profile)}{plan.pro ? ' · Pro' : ''}
            {syncState && syncState.status === 'offline' ? ' · Offline' : syncState && syncState.pending && syncState.status !== 'syncing' ? ' · Not yet backed up' : ''}
          </Text>
        </View>
        <Pressable onPress={onSettings} hitSlop={10} accessibilityRole="button" accessibilityLabel="Settings" style={styles.iconBtn}>
          <Ionicons name="settings-outline" size={22} color={colors.ink} />
        </Pressable>
      </View>

      <FlatList
        data={visible}
        keyExtractor={(quote) => quote.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <>
            <View style={styles.stats}>
              <Stat label="Awaiting reply" value={formatMoney(stats.pending, cur)} />
              <Stat label="Won" value={formatMoney(stats.won, cur)} color={colors.success} />
            </View>
            <View style={[styles.stats, { marginTop: 8 }]}>
              <Stat label="Unpaid invoices" value={formatMoney(stats.unpaid, cur)} color={stats.unpaid > 0 ? colors.accent : colors.ink} />
              <Stat label="Win rate" value={stats.winRate === null ? '—' : `${stats.winRate}%`} />
            </View>

            {stats.followUps > 0 && (
              <Pressable onPress={() => setFilter('sent')} style={[styles.banner, styles.bannerInfo]} accessibilityRole="button">
                <Ionicons name="notifications" size={18} color={colors.info} />
                <Text style={styles.bannerText}>
                  {stats.followUps === 1 ? '1 quote has had no reply — time to follow up' : `${stats.followUps} quotes have had no reply — time to follow up`}
                </Text>
              </Pressable>
            )}

            {!plan.pro && (
              <Pressable onPress={onUpgrade} style={styles.banner} accessibilityRole="button" accessibilityLabel="Upgrade to Pro">
                <Ionicons name="star" size={18} color={colors.accent} />
                <Text style={styles.bannerText}>
                  {left > 0 ? `${left} of ${FREE_QUOTES_PER_MONTH} free quotes left this month` : 'You’ve used this month’s free quotes'}
                </Text>
                <Text style={styles.bannerCta}>Go Pro</Text>
              </Pressable>
            )}

            {quotes.length > 0 && (
              <>
                <View style={styles.search}>
                  <Ionicons name="search" size={18} color={colors.faint} />
                  <TextInput
                    accessibilityLabel="Search quotes"
                    style={styles.searchInput}
                    placeholder="Search customer, job or number"
                    placeholderTextColor={colors.faint}
                    value={search}
                    onChangeText={setSearch}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
                <View style={styles.filters}>
                  {FILTERS.map((id) => (
                    <Chip key={id} label={FILTER_LABELS[id] || STATUS[id].label} selected={filter === id} onPress={() => setFilter(id)} />
                  ))}
                </View>
              </>
            )}
          </>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="document-text-outline" size={44} color={colors.faint} />
            <Text style={styles.emptyTitle}>{quotes.length ? 'Nothing here' : 'Send your first quote'}</Text>
            <Text style={styles.emptyText}>
              {quotes.length ? 'No quotes match.' : 'Describe the job, and get a priced, professional quote ready to send in under a minute.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => onOpen(item.id)} style={styles.quote} accessibilityRole="button" accessibilityLabel={`Quote ${item.number} for ${item.customer.name}`}>
            <View style={{ flex: 1 }}>
              <Text style={styles.customer} numberOfLines={1}>{item.customer.name || 'Customer'}</Text>
              <Text style={styles.jobTitle} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.meta}>{item.number}{item.invoice ? ` · ${item.invoice.number}` : ''} · {formatDate(item.createdAt)}</Text>
              {needsFollowUp(item) ? (
                <View style={styles.followTag}>
                  <Ionicons name="notifications" size={12} color={colors.info} />
                  <Text style={styles.followText}>Follow up</Text>
                </View>
              ) : null}
            </View>
            <View style={styles.quoteRight}>
              <Text style={styles.amount}>{formatMoney(computeTotals(item).total, cur)}</Text>
              <StatusPill status={item.invoice ? (item.invoice.paidAt ? 'paid' : 'invoiced') : item.status} />
            </View>
          </Pressable>
        )}
      />

      <View style={styles.footer}>
        <Button testID="new-quote" label="New quote" icon="add" variant="accent" onPress={onNew} />
      </View>
    </SafeAreaView>
  );
}

function Stat({ label, value, color = colors.ink }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6 },
  biz: { fontSize: 24, fontWeight: '800', color: colors.ink },
  trade: { fontSize: 13, color: colors.sub, marginTop: 1 },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line },
  list: { padding: 16, paddingBottom: 24 },
  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, backgroundColor: '#fff', borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, padding: 12 },
  statValue: { fontSize: 19, fontWeight: '800' },
  statLabel: { fontSize: 12, color: colors.sub, marginTop: 2 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.accentSoft, borderRadius: radius.md, padding: 12, marginTop: 10 },
  bannerInfo: { backgroundColor: colors.infoSoft },
  bannerText: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.ink },
  bannerCta: { fontSize: 13, fontWeight: '800', color: colors.accent },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 12, minHeight: 46, marginTop: 16 },
  searchInput: { flex: 1, minWidth: 0, fontSize: 15, color: colors.ink, paddingVertical: 8 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10, marginBottom: 12 },
  quote: { flexDirection: 'row', gap: 12, backgroundColor: '#fff', borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, padding: 14, marginBottom: 8 },
  customer: { fontSize: 16, fontWeight: '700', color: colors.ink },
  jobTitle: { fontSize: 14, color: colors.sub, marginTop: 2 },
  meta: { fontSize: 12, color: colors.faint, marginTop: 6 },
  followTag: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: colors.infoSoft, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, marginTop: 8 },
  followText: { fontSize: 12, fontWeight: '700', color: colors.info },
  quoteRight: { alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 },
  amount: { fontSize: 16, fontWeight: '800', color: colors.ink },
  empty: { alignItems: 'center', paddingVertical: 56, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: colors.ink, marginTop: 12 },
  emptyText: { fontSize: 14, color: colors.sub, textAlign: 'center', marginTop: 6, lineHeight: 20 },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.bg },
});
