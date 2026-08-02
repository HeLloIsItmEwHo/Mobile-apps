import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

const PLATFORM_STYLES = {
  eBay: { color: colors.ebay, label: 'eBay' },
  Poshmark: { color: colors.poshmark, label: 'Poshmark' },
  Mercari: { color: colors.mercari, label: 'Mercari' },
};

function CompRow({ comp, isFirst }) {
  const platform = PLATFORM_STYLES[comp.platform] ?? { color: colors.textSecondary, label: comp.platform };
  return (
    <View style={[styles.row, !isFirst && styles.rowDivider]}>
      <View style={[styles.platformTag, { backgroundColor: platform.color }]}>
        <Text style={styles.platformText}>{platform.label}</Text>
      </View>
      <View style={styles.middle}>
        <Text style={styles.condition}>{comp.condition}</Text>
        <Text style={styles.daysAgo}>{comp.daysAgo === 0 ? 'Today' : `${comp.daysAgo}d ago`}</Text>
      </View>
      <Text style={styles.price}>${comp.price.toFixed(2)}</Text>
    </View>
  );
}

export default function SoldCompsList({ comps }) {
  return (
    <View style={styles.card}>
      <Text style={styles.headerText}>Recent Sold Comps</Text>
      {comps.map((comp, idx) => (
        <CompRow comp={comp} isFirst={idx === 0} key={`${comp.platform}-${idx}`} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border },
  headerText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  platformTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, minWidth: 74, alignItems: 'center' },
  platformText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  middle: { flex: 1, marginLeft: 12 },
  condition: { color: colors.textPrimary, fontSize: 13, fontWeight: '600' },
  daysAgo: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  price: { color: colors.profit, fontSize: 16, fontWeight: '800' },
});
