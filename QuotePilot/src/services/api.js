// Client for the QuotePilot backend (see ../../server).
//
// Set EXPO_PUBLIC_API_URL to your deployed server, e.g. in a .env file:
//   EXPO_PUBLIC_API_URL=https://api.yourdomain.com
// The default only works for a simulator or browser on the same machine.

export const API_URL = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8787').replace(/\/+$/, '');

export class ApiError extends Error {
  constructor(message, { status = 0, code = null, offline = false } = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.offline = offline; // the server could not be reached at all
  }
}

let token = null;
export function setApiToken(next) {
  token = next || null;
}

async function request(method, path, body) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  let response;
  try {
    response = await fetch(API_URL + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    throw new ApiError('Can’t reach QuotePilot right now. Check your connection and try again.', { offline: true });
  } finally {
    clearTimeout(timer);
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch (error) {
    // Non-JSON body (e.g. a proxy error page); handled by the status check below.
  }
  if (!response.ok) {
    throw new ApiError(payload?.error || 'Something went wrong. Please try again.', { status: response.status, code: payload?.code });
  }
  return payload;
}

export const api = {
  signup: (email, password) => request('POST', '/auth/signup', { email, password }),
  login: (email, password) => request('POST', '/auth/login', { email, password }),
  logout: () => request('POST', '/auth/logout'),
  forgotPassword: (email) => request('POST', '/auth/forgot', { email }),
  me: () => request('GET', '/me'),
  deleteAccount: (password) => request('DELETE', '/me', { password }),
  sync: (since, changes) => request('POST', '/sync', { since, changes }),
  checkout: (plan) => request('POST', '/billing/checkout', { plan }),
  billingPortal: () => request('POST', '/billing/portal'),
};
