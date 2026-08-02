import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Trash2 } from 'lucide-react-native';
import { colors } from '../theme/colors';

export default function FlipCard({ flip, onDelete }) {
  const isProfitable = flip.netProfit >= 0;

  return (
    <View style={styles.card}>
      {flip.photoUri ? (
        <Image source={{ uri: flip.photoUri }} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, styles.thumbPlaceholder]} />
      )}
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>
          {flip.title}
        </Text>
        <Text style={styles.category}>{flip.category}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.buyPrice}>Bought ${Number(flip.buyPrice).toFixed(2)}</Text>
          <Text style={[styles.profit, { color: isProfitable ? colors.profit : colors.danger }]}>
            {isProfitable ? '+' : '-'}${Math.abs(flip.netProfit).toFixed(2)} profit
          </Text>
        </View>
      </View>
      <Pressable style={styles.deleteButton} onPress={() => onDelete(flip.id)} hitSlop={10}>
        <Trash2 size={18} color={colors.danger} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  thumb: { width: 56, height: 56, borderRadius: 10, backgroundColor: colors.surfaceLight },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, marginLeft: 12 },
  title: { color: colors.textPrimary, fontWeight: '700', fontSize: 14 },
  category: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  buyPrice: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },
  profit: { fontSize: 12, fontWeight: '800' },
  deleteButton: { padding: 8, marginLeft: 6 },
});
