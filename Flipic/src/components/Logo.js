import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Zap } from 'lucide-react-native';
import { colors } from '../theme/colors';

export default function Logo({ size = 22 }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.text, { fontSize: size }]}>Flipic</Text>
      <Zap size={size} color={colors.profit} fill={colors.profit} style={styles.icon} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  text: { color: colors.textPrimary, fontWeight: '800', letterSpacing: 0.5 },
  icon: { marginLeft: 2 },
});
