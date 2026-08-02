import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Camera, Layers } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';

const TABS = [
  { key: 'scan', label: 'Scan', icon: Camera },
  { key: 'myflips', label: 'My Flips', icon: Layers },
];

export default function TabBar({ activeTab, onChangeTab }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      {TABS.map(({ key, label, icon: Icon }) => {
        const active = activeTab === key;
        return (
          <Pressable key={key} style={styles.tab} onPress={() => onChangeTab(key)} hitSlop={8}>
            <Icon size={22} color={active ? colors.profit : colors.textMuted} strokeWidth={active ? 2.5 : 2} />
            <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 11, color: colors.textMuted, marginTop: 4, fontWeight: '600' },
  labelActive: { color: colors.profit },
});
