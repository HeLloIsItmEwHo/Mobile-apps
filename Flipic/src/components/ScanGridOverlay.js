import React from 'react';
import { StyleSheet, View } from 'react-native';

export default function ScanGridOverlay() {
  return (
    <View style={styles.container} pointerEvents="none">
      <View style={[styles.line, styles.vertical, { left: '33.33%' }]} />
      <View style={[styles.line, styles.vertical, { left: '66.66%' }]} />
      <View style={[styles.line, styles.horizontal, { top: '33.33%' }]} />
      <View style={[styles.line, styles.horizontal, { top: '66.66%' }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject },
  line: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.15)' },
  vertical: { top: 0, bottom: 0, width: StyleSheet.hairlineWidth },
  horizontal: { left: 0, right: 0, height: StyleSheet.hairlineWidth },
});
