import React, { useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TrendingUp } from 'lucide-react-native';

import FlipCard from '../components/FlipCard';
import EmptyState from '../components/EmptyState';
import { colors } from '../theme/colors';

export default function MyFlipsScreen({ flips, loading, onDelete }) {
  const totalProfit = useMemo(
    () => flips.reduce((sum, flip) => sum + (flip.netProfit || 0), 0),
    [flips]
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Flips</Text>
      </View>

      {flips.length > 0 && (
        <View style={styles.summaryCard}>
          <TrendingUp size={20} color={colors.profit} />
          <View style={styles.summaryTextGroup}>
            <Text style={styles.summaryLabel}>Total Potential Profit</Text>
            <Text style={styles.summaryValue}>
              {totalProfit >= 0 ? '+' : '-'}${Math.abs(totalProfit).toFixed(2)}
            </Text>
          </View>
          <Text style={styles.summaryCount}>
            {flips.length} item{flips.length === 1 ? '' : 's'}
          </Text>
        </View>
      )}

      {!loading && flips.length === 0 ? (
        <EmptyState
          title="No flips saved yet"
          subtitle="Scan an item and save it here to start tracking your resale profits."
        />
      ) : (
        <FlatList
          data={flips}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <FlipCard flip={item} onDelete={onDelete} />}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  headerTitle: { color: colors.textPrimary, fontSize: 24, fontWeight: '800' },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryTextGroup: { flex: 1, marginLeft: 12 },
  summaryLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  summaryValue: { color: colors.profit, fontSize: 22, fontWeight: '800', marginTop: 2 },
  summaryCount: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },
  listContent: { paddingHorizontal: 16, paddingBottom: 20 },
});
