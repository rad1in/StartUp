import axios from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// In Expo Go the Metro host (hostUri) is the dev machine's LAN IP — the same
// machine that runs the backend on :4000, so the API base can be derived
// automatically and the app works on a physical device with zero config.
// A real production build (EAS build / standalone app store binary) has no
// dev server at all, so hostUri is empty and this would otherwise silently
// fall back to "localhost" — the phone's own loopback, not reachable by
// anything. EXPO_PUBLIC_* env vars (inlined at build time, no extra config
// needed on Expo SDK 49+) take priority whenever they're set, which is what
// a production build must always set.
function resolveHost() {
  if (Platform.OS === 'web') return 'localhost';
  const hostUri = Constants.expoConfig?.hostUri || Constants.expoGoConfig?.debuggerHost || '';
  const host = hostUri.split(':')[0];
  return host || 'localhost';
}

export const API_HOST = resolveHost();
export const API_BASE = process.env.EXPO_PUBLIC_API_URL || `http://${API_HOST}:5000/api`;
export const UPLOADS_BASE = process.env.EXPO_PUBLIC_UPLOADS_URL || `http://${API_HOST}:5000`;
export const WEB_PANEL_BASE = process.env.EXPO_PUBLIC_WEB_URL || `http://${API_HOST}:5173`;

const api = axios.create({ baseURL: API_BASE, timeout: 20000 });

let accessToken = null;
let onUnauthorized = null;

export function setAccessToken(token) {
  accessToken = token;
}

export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

// A request can fail before the server ever answers (offline, timeout, server
// unreachable) — axios then gives `err.response === undefined` and every
// screen in the app does `err.response?.data?.message || '<fallback>'`. Those
// fallbacks are usually terse ("سفارش ثبت نشد") and don't tell the user
// where the problem is, why it happened, or how to fix it. Synthesizing a
// proper three-part message here — once — means every existing call site
// picks it up automatically, matching the same fix on the web client.
function describeNetworkFailure(err) {
  if (err.code === 'ECONNABORTED' || /timeout/i.test(err.message || '')) {
    return 'درخواست شما بیش از حد معمول طول کشید: به نظر می‌رسد اتصال اینترنت شما کند یا ناپایدار است. لطفاً اتصال اینترنت خود را بررسی کنید و دوباره تلاش کنید.';
  }
  return 'ارتباط با سرور برقرار نشد: ممکن است اینترنت شما قطع باشد یا سرور موقتاً در دسترس نباشد. اتصال اینترنت خود را بررسی کنید و چند لحظه دیگر دوباره تلاش کنید.';
}

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (!err.response) {
      err.response = { data: { message: describeNetworkFailure(err) } };
      return Promise.reject(err);
    }
    if (err.response?.status === 401 && accessToken && onUnauthorized) {
      onUnauthorized();
    }
    return Promise.reject(err);
  }
);

export function imageUrl(pathOrUrl) {
  if (!pathOrUrl) return null;
  if (pathOrUrl.startsWith('http')) return pathOrUrl;
  return `${UPLOADS_BASE}${pathOrUrl}`;
}

export default api;
