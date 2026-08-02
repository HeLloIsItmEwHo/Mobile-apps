import React, { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera as CameraIcon, Check } from 'lucide-react-native';

import ConfidenceBadge from '../components/ConfidenceBadge';
import DealScoreBadge from '../components/DealScoreBadge';
import MarketValueCard from '../components/MarketValueCard';
import ProfitCalculator from '../components/ProfitCalculator';
import SoldCompsList from '../components/SoldCompsList';
import { colors } from '../theme/colors';
import { calculateProfit } from '../utils/profitCalculator';

export default function ResultsScreen({ result, onSave, onScanAnother }) {
  const [buyPrice, setBuyPrice] = useState(String(result.suggestedBuyPrice ?? 8));
  const [shipping, setShipping] = useState('6');
  const [feePercent, setFeePercent] = useState(13);

  const { netProfit, roi } = useMemo(
    () =>
      calculateProfit({
        soldPrice: result.avgSoldPrice,
        buyPrice: parseFloat(buyPrice) || 0,
        shipping: parseFloat(shipping) || 0,
        feePercent,
      }),
    [buyPrice, shipping, feePercent, result.avgSoldPrice]
  );

  const handleSave = () => {
    onSave({
      id: result.id,
      title: result.title,
      category: result.category,
      photoUri: result.photoUri,
      dealScore: result.dealScore,
      avgSoldPrice: result.avgSoldPrice,
      buyPrice: parseFloat(buyPrice) || 0,
      shipping: parseFloat(shipping) || 0,
      feePercent,
      netProfit,
      roi,
      savedAt: new Date().toISOString(),
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          {result.photoUri ? (
            <Image source={{ uri: result.photoUri }} style={styles.thumb} />
          ) : (
            <View style={[styles.thumb, styles.thumbPlaceholder]}>
              <CameraIcon size={28} color={colors.textMuted} />
            </View>
          )}
          <View style={styles.headerInfo}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{result.category}</Text>
            </View>
            <Text style={styles.title}>{result.title}</Text>
            <ConfidenceBadge confidence={result.confidence} />
          </View>
        </View>

        <View style={styles.scoreSection}>
          <DealScoreBadge score={result.dealScore} />
        </View>

        <MarketValueCard low={result.valueRange.low} high={result.valueRange.high} avg={result.avgSoldPrice} />

        <View style={styles.spacer} />

        <ProfitCalculator
          buyPrice={buyPrice}
          shipping={shipping}
          feePercent={feePercent}
          onChangeBuyPrice={setBuyPrice}
          onChangeShipping={setShipping}
          onChangeFeePercent={setFeePercent}
          netProfit={netProfit}
          roi={roi}
        />

        <View style={styles.spacer} />

        <SoldCompsList comps={result.soldComps} />
      </ScrollView>

      <View style={styles.actionBar}>
        <Pressable style={styles.secondaryButton} onPress={onScanAnother}>
          <Text style={styles.secondaryButtonText}>Scan Another Item</Text>
        </Pressable>
        <Pressable style={styles.primaryButton} onPress={handleSave}>
          <Check size={18} color={colors.background} />
          <Text style={styles.primaryButtonText}>Save to My Flips</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: 16, paddingBottom: 20 },
  header: { flexDirection: 'row' },
  thumb: { width: 90, height: 90, borderRadius: 16, backgroundColor: colors.surfaceLight },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  headerInfo: { flex: 1, marginLeft: 14, justifyContent: 'center' },
  categoryBadge: {
    backgroundColor: colors.surfaceLight,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 6,
  },
  categoryText: { color: colors.textSecondary, fontSize: 11, fontWeight: '700' },
  title: { color: colors.textPrimary, fontSize: 17, fontWeight: '800', marginBottom: 6 },
  scoreSection: { alignItems: 'center', marginVertical: 20 },
  spacer: { height: 16 },
  actionBar: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  secondaryButtonText: { color: colors.textSecondary, fontWeight: '700', fontSize: 14 },
  primaryButton: {
    flex: 1.3,
    flexDirection: 'row',
    backgroundColor: colors.profit,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: { color: colors.background, fontWeight: '800', fontSize: 14, marginLeft: 6 },
});
