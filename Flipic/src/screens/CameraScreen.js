import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Zap, ZapOff } from 'lucide-react-native';

import Logo from '../components/Logo';
import StatsPill from '../components/StatsPill';
import ScanGridOverlay from '../components/ScanGridOverlay';
import ScanReticle from '../components/ScanReticle';
import ScanningOverlay from '../components/ScanningOverlay';
import ShutterButton from '../components/ShutterButton';
import { colors } from '../theme/colors';
import { analyzeImage } from '../services/aiEvaluatorService';

const SCAN_ANIMATION_MS = 1500;

export default function CameraScreen({ totalSavedFlips, onScanComplete }) {
  const cameraRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [flashOn, setFlashOn] = useState(false);
  const [scanning, setScanning] = useState(false);

  const handleShutterPress = async () => {
    if (scanning) return;
    setScanning(true);

    let photo = null;
    try {
      photo = await cameraRef.current?.takePictureAsync({ quality: 0.5, skipProcessing: true });
    } catch (err) {
      photo = null;
    }

    const [result] = await Promise.all([
      analyzeImage({ uri: photo?.uri }),
      new Promise((resolve) => setTimeout(resolve, SCAN_ANIMATION_MS)),
    ]);

    setScanning(false);
    onScanComplete(result);
  };

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permissionContainer}>
        <Text style={styles.permissionTitle}>Camera access needed</Text>
        <Text style={styles.permissionSubtitle}>
          Flipic needs your camera to scan items and estimate resale value.
        </Text>
        <Pressable style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant Camera Access</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
        flash={flashOn ? 'on' : 'off'}
      />
      <ScanGridOverlay />
      <ScanReticle active={scanning} />
      {scanning && <ScanningOverlay />}

      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        <View style={styles.topBar}>
          <Logo />
          <View style={styles.topBarRight}>
            <StatsPill count={totalSavedFlips} />
            <Pressable style={styles.flashButton} onPress={() => setFlashOn((v) => !v)} hitSlop={8}>
              {flashOn ? <Zap size={20} color={colors.gold} /> : <ZapOff size={20} color={colors.textSecondary} />}
            </Pressable>
          </View>
        </View>

        <View style={styles.bottomBar}>
          <ShutterButton onPress={handleShutterPress} scanning={scanning} />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  overlay: { flex: 1, justifyContent: 'space-between' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  topBarRight: { flexDirection: 'row', alignItems: 'center' },
  flashButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(15,23,42,0.75)',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  bottomBar: { alignItems: 'center', paddingBottom: 24 },
  permissionContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  permissionTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '800' },
  permissionSubtitle: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  permissionButton: {
    marginTop: 20,
    backgroundColor: colors.profit,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  permissionButtonText: { color: colors.background, fontWeight: '800' },
});
