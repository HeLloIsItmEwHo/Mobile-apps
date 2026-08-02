import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Trophy } from 'lucide-react-native';
import { colors } from '../theme/colors';

export default function StatsPill({ count }) {
  return (
    <View style={styles.pill}>
      <Trophy size={14} color={colors.gold} />
      <Text style={styles.text}>{count} Saved Flip{count === 1 ? '' : 's'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15,23,42,0.75)',
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  text: { color: colors.textPrimary, fontSize: 12, fontWeight: '600', marginLeft: 6 },
});
