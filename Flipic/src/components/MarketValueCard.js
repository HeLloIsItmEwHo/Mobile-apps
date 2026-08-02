import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { TrendingUp } from 'lucide-react-native';
import { colors } from '../theme/colors';

export default function MarketValueCard({ low, high, avg }) {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <TrendingUp size={16} color={colors.profit} />
        <Text style={styles.headerText}>Estimated Market Value</Text>
      </View>
      <Text style={styles.range}>
        ${low.toFixed(2)} - ${high.toFixed(2)}
      </Text>
      <Text style={styles.avg}>
        Avg. sold price: <Text style={styles.avgValue}>${avg.toFixed(2)}</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  headerText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  range: { color: colors.textPrimary, fontSize: 26, fontWeight: '800', marginTop: 8 },
  avg: { color: colors.textMuted, fontSize: 13, marginTop: 4 },
  avgValue: { color: colors.textSecondary, fontWeight: '700' },
});
