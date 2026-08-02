import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { DollarSign } from 'lucide-react-native';
import { colors } from '../theme/colors';

export default function ProfitCalculator({
  buyPrice,
  shipping,
  feePercent,
  onChangeBuyPrice,
  onChangeShipping,
  onChangeFeePercent,
  netProfit,
  roi,
}) {
  const isProfitable = netProfit >= 0;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <DollarSign size={16} color={colors.gold} />
        <Text style={styles.headerText}>Cha-Ching Profit Calculator</Text>
      </View>

      <View style={styles.inputRow}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Thrift Tag Price ($)</Text>
          <TextInput
            style={styles.input}
            keyboardType="decimal-pad"
            value={buyPrice}
            onChangeText={onChangeBuyPrice}
            placeholder="8"
            placeholderTextColor={colors.textMuted}
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Est. Shipping ($)</Text>
          <TextInput
            style={styles.input}
            keyboardType="decimal-pad"
            value={shipping}
            onChangeText={onChangeShipping}
            placeholder="6"
            placeholderTextColor={colors.textMuted}
          />
        </View>
      </View>

      <View style={styles.sliderGroup}>
        <View style={styles.sliderLabelRow}>
          <Text style={styles.inputLabel}>Marketplace Fees</Text>
          <Text style={styles.feeValue}>{feePercent}%</Text>
        </View>
        <Slider
          minimumValue={0}
          maximumValue={30}
          step={1}
          value={feePercent}
          onValueChange={onChangeFeePercent}
          minimumTrackTintColor={colors.profit}
          maximumTrackTintColor={colors.border}
          thumbTintColor={colors.profit}
        />
      </View>

      <View style={styles.resultsRow}>
        <View style={styles.resultBlock}>
          <Text style={styles.resultLabel}>Net Profit</Text>
          <Text style={[styles.resultValue, { color: isProfitable ? colors.profit : colors.danger }]}>
            {isProfitable ? '+' : '-'}${Math.abs(netProfit).toFixed(2)}
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.resultBlock}>
          <Text style={styles.resultLabel}>ROI</Text>
          <Text style={[styles.resultValue, { color: isProfitable ? colors.profit : colors.danger }]}>
            {isProfitable ? '+' : ''}
            {roi.toFixed(0)}%
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  headerText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputRow: { flexDirection: 'row' },
  inputGroup: { flex: 1, marginRight: 12 },
  inputLabel: { color: colors.textMuted, fontSize: 12, marginBottom: 6, fontWeight: '600' },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  sliderGroup: { marginTop: 16 },
  sliderLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  feeValue: { color: colors.textPrimary, fontWeight: '700', fontSize: 13 },
  resultsRow: {
    flexDirection: 'row',
    marginTop: 18,
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  resultBlock: { flex: 1, alignItems: 'center' },
  divider: { width: 1, height: '100%', backgroundColor: colors.border },
  resultLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  resultValue: { fontSize: 22, fontWeight: '800' },
});
