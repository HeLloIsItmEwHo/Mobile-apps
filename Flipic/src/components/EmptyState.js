import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PackageSearch } from 'lucide-react-native';
import { colors } from '../theme/colors';

export default function EmptyState({ title, subtitle }) {
  return (
    <View style={styles.container}>
      <PackageSearch size={48} color={colors.textMuted} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  title: { color: colors.textPrimary, fontSize: 16, fontWeight: '700', marginTop: 16 },
  subtitle: { color: colors.textMuted, fontSize: 13, marginTop: 6, textAlign: 'center' },
});
