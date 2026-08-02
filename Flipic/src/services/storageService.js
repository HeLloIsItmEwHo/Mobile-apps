import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@flipic/saved_flips';

export async function getSavedFlips() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.warn('Flipic: failed to load saved flips', err);
    return [];
  }
}

export async function saveFlip(flip) {
  const existing = await getSavedFlips();
  const record = { ...flip, id: flip.id ?? `flip_${Date.now()}` };
  const updated = [record, ...existing.filter((f) => f.id !== record.id)];
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export async function deleteFlip(flipId) {
  const existing = await getSavedFlips();
  const updated = existing.filter((f) => f.id !== flipId);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}
