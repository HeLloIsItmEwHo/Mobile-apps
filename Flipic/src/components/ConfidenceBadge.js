import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BadgeCheck } from 'lucide-react-native';
import { colors } from '../theme/colors';

export default function ConfidenceBadge({ confidence }) {
  const pct = Math.round(confidence * 100);
  return (
    <View style={styles.badge}>
      <BadgeCheck size={14} color={colors.profit} />
      <Text style={styles.text}>{pct}% Match</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34,197,94,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.4)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    alignSelf: 'flex-start',
  },
  text: { color: colors.profit, fontSize: 12, fontWeight: '700', marginLeft: 4 },
});
