import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Camera } from 'lucide-react-native';
import { colors } from '../theme/colors';

export default function ShutterButton({ onPress, scanning }) {
  return (
    <View style={styles.wrapper}>
      <Pressable
        style={({ pressed }) => [styles.outerRing, pressed && !scanning && styles.pressed]}
        onPress={onPress}
        disabled={scanning}
      >
        <View style={styles.inner}>
          {scanning ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <Camera size={30} color={colors.background} strokeWidth={2.5} />
          )}
        </View>
      </Pressable>
      <Text style={styles.label}>{scanning ? 'Analyzing...' : 'Snap & Analyze'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center' },
  outerRing: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.profit,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.profit,
    shadowOpacity: 0.6,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  pressed: { transform: [{ scale: 0.94 }] },
  inner: { alignItems: 'center', justifyContent: 'center' },
  label: { color: colors.textPrimary, fontWeight: '700', fontSize: 13, marginTop: 10 },
});
