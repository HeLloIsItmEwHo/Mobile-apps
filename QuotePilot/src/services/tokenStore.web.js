// Browsers have no keychain, so the web build keeps the sign-in token in localStorage.
const KEY = 'qp.session';

export const getToken = async () => {
  try {
    return window.localStorage.getItem(KEY);
  } catch (error) {
    return null;
  }
};
export const setToken = async (token) => window.localStorage.setItem(KEY, token);
export const clearToken = async () => {
  try {
    window.localStorage.removeItem(KEY);
  } catch (error) {
    // Storage unavailable (private mode); nothing to clear.
  }
};
