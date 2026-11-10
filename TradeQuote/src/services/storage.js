import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  profile: 'tq.profile.v1',
  logo: 'tq.logo.v1', // kept apart from the profile: it is a large base64 string
  quotes: 'tq.quotes.v1',
  plan: 'tq.plan.v1',
  usage: 'tq.usage.v1',
};

async function read(key, fallback) {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    console.warn(`Could not read ${key}`, error);
    return fallback;
  }
}

async function write(key, value) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function loadAll() {
  const [profile, logo, quotes, plan, usage] = await Promise.all([
    read(KEYS.profile, null),
    read(KEYS.logo, null),
    read(KEYS.quotes, []),
    read(KEYS.plan, { pro: false }),
    read(KEYS.usage, { month: '', count: 0 }),
  ]);
  return { profile: profile ? { ...profile, logo } : null, quotes, plan, usage };
}

export async function saveProfile(profile) {
  const { logo, ...rest } = profile;
  await write(KEYS.profile, rest);
  if (logo) await write(KEYS.logo, logo);
  else await AsyncStorage.removeItem(KEYS.logo);
}

export const saveQuotes = (quotes) => write(KEYS.quotes, quotes);
export const savePlan = (plan) => write(KEYS.plan, plan);
export const saveUsage = (usage) => write(KEYS.usage, usage);

export async function resetAll() {
  await AsyncStorage.multiRemove(Object.values(KEYS));
}
