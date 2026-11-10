import AsyncStorage from '@react-native-async-storage/async-storage';

import { EMPTY_META } from './sync';

// The device's working copy. It is what the app reads and writes, so the app
// works offline; sync.js keeps it in step with the account in the cloud.
const KEYS = {
  profile: 'qp.profile.v1',
  logo: 'qp.logo.v1', // kept apart from the profile: it is a large base64 string
  quotes: 'qp.quotes.v1',
  plan: 'qp.plan.v1', // last plan the server reported, for offline use
  usage: 'qp.usage.v1',
  account: 'qp.account.v1', // { id, email } of the signed-in user
  sync: 'qp.sync.v1',
};

export const FREE_PLAN = { pro: false, status: 'none', plan: null, periodEnd: null, cancelAtPeriodEnd: false, trialAvailable: true };

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
  const [profile, logo, quotes, plan, usage, account, syncMeta] = await Promise.all([
    read(KEYS.profile, null),
    read(KEYS.logo, null),
    read(KEYS.quotes, []),
    read(KEYS.plan, FREE_PLAN),
    read(KEYS.usage, { month: '', count: 0 }),
    read(KEYS.account, null),
    read(KEYS.sync, EMPTY_META),
  ]);
  return { profile: profile ? { ...profile, logo } : null, quotes, plan, usage, account, syncMeta };
}

export async function saveProfile(profile) {
  if (!profile) {
    await AsyncStorage.multiRemove([KEYS.profile, KEYS.logo]);
    return;
  }
  const { logo, ...rest } = profile;
  await write(KEYS.profile, rest);
  if (logo) await write(KEYS.logo, logo);
  else await AsyncStorage.removeItem(KEYS.logo);
}

export const saveQuotes = (quotes) => write(KEYS.quotes, quotes);
export const savePlan = (plan) => write(KEYS.plan, plan);
export const saveUsage = (usage) => write(KEYS.usage, usage);
export const saveAccount = (account) => write(KEYS.account, account);
export const saveSyncMeta = (meta) => write(KEYS.sync, meta);

// Removes everything belonging to the signed-in account from this device.
export async function clearLocalData() {
  await AsyncStorage.multiRemove(Object.values(KEYS));
}
