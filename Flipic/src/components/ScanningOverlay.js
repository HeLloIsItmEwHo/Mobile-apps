import React, { useEffect } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Sparkles } from 'lucide-react-native';
import { colors } from '../theme/colors';

const { height } = Dimensions.get('window');

export default function ScanningOverlay() {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(withTiming(1, { duration: 1100, easing: Easing.linear }), -1, false);
  }, [progress]);

  const lineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: progress.value * height * 0.55 }],
  }));

  return (
    <View style={styles.container} pointerEvents="none">
      <View style={styles.border} />
      <Animated.View style={[styles.scanLine, lineStyle]} />
      <View style={styles.badge}>
        <Sparkles size={16} color={colors.background} />
        <Text style={styles.badgeText}>Analyzing item...</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject, alignItems: 'center' },
  border: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 4,
    borderColor: colors.magenta,
  },
  scanLine: {
    position: 'absolute',
    top: '20%',
    left: 24,
    right: 24,
    height: 3,
    backgroundColor: colors.profit,
    shadowColor: colors.profit,
    shadowOpacity: 0.9,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  badge: {
    position: 'absolute',
    bottom: 190,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.profit,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  badgeText: { color: colors.background, fontWeight: '700', fontSize: 13, marginLeft: 6 },
});
