import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const api = axios.create({ baseURL, withCredentials: true });

let accessToken = null;
let onUnauthorized = null;

export function setAccessToken(token) {
  accessToken = token;
}

export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

// Attaches the visitor's chosen UI language to every GET request so the
// backend's AI-translated menu/venue content (see lib/autoTranslate.js) is
// served in the right language automatically, without every call site having
// to pass it explicitly. Read straight from localStorage (same key as
// LanguageContext) since this runs outside React. Venue-owner/admin screens
// are unaffected — the backend already ignores `lang` in that context so
// owners always see their own original text.
const LANG_STORAGE_KEY = 'et-cafe-lang';

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  if (config.method === 'get' && !config.params?.lang) {
    const lang = localStorage.getItem(LANG_STORAGE_KEY);
    if (lang) config.params = { ...config.params, lang };
  }
  return config;
});

let refreshPromise = null;

// A request can fail before the server ever answers (offline, timeout, server
// unreachable, CORS/DNS failure) — axios then gives `error.response === undefined`
// and every call site in the app does `err.response?.data?.message || '<fallback>'`.
// Those fallback strings are usually terse ("ثبت‌نام ناموفق بود") and don't tell
// the user where the problem is, why it happened, or how to fix it. Synthesizing
// a proper three-part message here — once — means every existing call site
// picks it up automatically, without having to touch each one individually.
function describeNetworkFailure(error) {
  if (error.code === 'ECONNABORTED' || /timeout/i.test(error.message || '')) {
    return 'درخواست شما بیش از حد معمول طول کشید: به نظر می‌رسد اتصال اینترنت شما کند یا ناپایدار است. لطفاً اتصال اینترنت خود را بررسی کنید و دوباره تلاش کنید.';
  }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return 'دستگاه شما به اینترنت وصل نیست: لطفاً اتصال Wi-Fi یا اینترنت خود را بررسی کرده و دوباره تلاش کنید.';
  }
  return 'ارتباط با سرور برقرار نشد: ممکن است سرور موقتاً در دسترس نباشد یا اینترنت شما قطع باشد. چند لحظه صبر کنید و دوباره تلاش کنید؛ اگر مشکل ادامه داشت، کمی بعد دوباره امتحان کنید.';
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (!error.response) {
      error.response = { data: { message: describeNetworkFailure(error) } };
      return Promise.reject(error);
    }

    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url.includes('/auth/')) {
      originalRequest._retry = true;
      try {
        refreshPromise = refreshPromise || api.post('/auth/refresh');
        const { data } = await refreshPromise;
        refreshPromise = null;
        setAccessToken(data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        refreshPromise = null;
        if (onUnauthorized) onUnauthorized();
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
