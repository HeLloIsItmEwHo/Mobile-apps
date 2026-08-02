import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import CameraScreen from './src/screens/CameraScreen';
import ResultsScreen from './src/screens/ResultsScreen';
import MyFlipsScreen from './src/screens/MyFlipsScreen';
import TabBar from './src/components/TabBar';
import { colors } from './src/theme/colors';
import {
  getSavedFlips,
  saveFlip as persistFlip,
  deleteFlip as removeFlip,
} from './src/services/storageService';

export default function App() {
  const [activeTab, setActiveTab] = useState('scan');
  const [scanResult, setScanResult] = useState(null);
  const [flips, setFlips] = useState([]);
  const [loadingFlips, setLoadingFlips] = useState(true);

  useEffect(() => {
    (async () => {
      const saved = await getSavedFlips();
      setFlips(saved);
      setLoadingFlips(false);
    })();
  }, []);

  const handleScanComplete = useCallback((result) => {
    setScanResult(result);
  }, []);

  const handleScanAnother = useCallback(() => {
    setScanResult(null);
  }, []);

  const handleSaveFlip = useCallback(async (flip) => {
    const updated = await persistFlip(flip);
    setFlips(updated);
    setScanResult(null);
    setActiveTab('myflips');
  }, []);

  const handleDeleteFlip = useCallback(async (flipId) => {
    const updated = await removeFlip(flipId);
    setFlips(updated);
  }, []);

  const showTabBar = !scanResult;

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <StatusBar style="light" />
        {scanResult ? (
          <ResultsScreen result={scanResult} onSave={handleSaveFlip} onScanAnother={handleScanAnother} />
        ) : activeTab === 'scan' ? (
          <CameraScreen totalSavedFlips={flips.length} onScanComplete={handleScanComplete} />
        ) : (
          <MyFlipsScreen flips={flips} loading={loadingFlips} onDelete={handleDeleteFlip} />
        )}
        {showTabBar && <TabBar activeTab={activeTab} onChangeTab={setActiveTab} />}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
