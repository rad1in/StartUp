import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { setAccessToken, setUnauthorizedHandler } from '../api/client';
import { authenticateBiometric, getBiometricEnabled } from '../services/biometricAuth';

const STORAGE_KEY = 'etcafe.auth';
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // True while a saved session exists but biometric unlock (opted in via
  // Settings) hasn't succeeded yet — the session stays in storage untouched
  // so the user can just retry Face/Touch ID instead of losing it.
  const [locked, setLocked] = useState(false);
  const [pendingSession, setPendingSession] = useState(null);

  const persist = useCallback(async (token, nextUser) => {
    setAccessToken(token);
    setUser(nextUser);
    if (token && nextUser) {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user: nextUser }));
    } else {
      await AsyncStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const logout = useCallback(async () => {
    api.post('/auth/logout').catch(() => {});
    await persist(null, null);
  }, [persist]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      persist(null, null);
    });
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const session = JSON.parse(raw);
          if (await getBiometricEnabled()) {
            setPendingSession(session);
            setLocked(true);
          } else {
            await restoreSession(session);
          }
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [persist]);

  async function restoreSession({ token, user: savedUser }) {
    setAccessToken(token);
    // Confirm the stored token is still valid; otherwise drop the session.
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user || savedUser);
    } catch {
      setAccessToken(null);
      await AsyncStorage.removeItem(STORAGE_KEY);
    }
  }

  const unlock = useCallback(async () => {
    const ok = await authenticateBiometric();
    if (!ok || !pendingSession) return false;
    await restoreSession(pendingSession);
    setPendingSession(null);
    setLocked(false);
    return true;
  }, [pendingSession]);

  // Prompt automatically as soon as we know the app is locked, instead of
  // making the user tap an extra "Unlock" button first.
  useEffect(() => {
    if (locked) unlock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locked]);

  async function login(email, password, captchaToken) {
    const { data } = await api.post('/auth/login', { email, password, captchaToken });
    if (data.accessToken) await persist(data.accessToken, data.user);
    return data;
  }

  async function loginWithOtp(phone, code) {
    const { data } = await api.post('/auth/login/otp/verify', { phone, code });
    if (data.accessToken) await persist(data.accessToken, data.user);
    return data;
  }

  async function requestLoginOtp(phone, captchaToken) {
    const { data } = await api.post('/auth/login/otp/request', { phone, captchaToken });
    return data;
  }

  async function register(payload) {
    const { data } = await api.post('/auth/register', payload);
    if (data.accessToken) await persist(data.accessToken, data.user);
    return data;
  }

  // Re-fetches /auth/me and updates both in-memory and persisted state —
  // used after anything that changes the user server-side without a fresh
  // login (2FA toggle, role upgrade from registering a venue, profile edits).
  const refreshUser = useCallback(async () => {
    const { data } = await api.get('/auth/me');
    setUser((prev) => {
      const nextUser = data.user || prev;
      AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
        if (!raw) return;
        const session = JSON.parse(raw);
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...session, user: nextUser }));
      });
      return nextUser;
    });
    return data.user;
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, locked, unlock, login, loginWithOtp, requestLoginOtp, register, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
