import * as SecureStore from 'expo-secure-store';

// The sign-in token is kept in the device keychain / keystore, not in plain app storage.
const KEY = 'qp.session';

export const getToken = () => SecureStore.getItemAsync(KEY).catch(() => null);
export const setToken = (token) => SecureStore.setItemAsync(KEY, token);
export const clearToken = () => SecureStore.deleteItemAsync(KEY).catch(() => {});
