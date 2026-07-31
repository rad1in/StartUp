import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import api, { setAccessToken, setUnauthorizedHandler } from '../services/api';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // Set while an admin is impersonating a venue owner — the admin's own
  // session lives untouched in the refresh cookie the whole time, so ending
  // impersonation is just a normal token refresh (see endImpersonation below).
  const [impersonation, setImpersonation] = useState(null);

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(clearSession);
  }, [clearSession]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.post('/auth/refresh');
        setAccessToken(data.accessToken);
        setUser(data.user);
      } catch (err) {
        clearSession();
      } finally {
        setLoading(false);
      }
    })();
  }, [clearSession]);

  // Apply an auth response: if it carries tokens, start the session; otherwise
  // it's a 2FA challenge the caller must complete. Returns the raw data so the
  // caller can branch on `twoFactorRequired`.
  const applyAuth = useCallback((data) => {
    if (data.accessToken) {
      setAccessToken(data.accessToken);
      setUser(data.user);
    }
    return data;
  }, []);

  const login = useCallback(
    async (email, password, captchaExtra = {}) =>
      applyAuth((await api.post('/auth/login', { email, password, ...captchaExtra })).data),
    [applyAuth]
  );

  const requestLoginOtp = useCallback(
    (phone, captchaExtra = {}) => api.post('/auth/login/otp/request', { phone, ...captchaExtra }).then((r) => r.data),
    []
  );

  const verifyLoginOtp = useCallback(
    async (phone, code) => applyAuth((await api.post('/auth/login/otp/verify', { phone, code })).data),
    [applyAuth]
  );

  const loginWithGoogle = useCallback(
    async (idToken) => applyAuth((await api.post('/auth/login/google', { idToken })).data),
    [applyAuth]
  );

  const completeTwoFactor = useCallback(
    async (challengeToken, code) => applyAuth((await api.post('/auth/login/2fa', { challengeToken, code })).data),
    [applyAuth]
  );

  const register = useCallback(async (payload) => {
    const { data } = await api.post('/auth/register', payload);
    setAccessToken(data.accessToken);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    await api.post('/auth/logout');
    clearSession();
  }, [clearSession]);

  const refreshUser = useCallback(async () => {
    const { data } = await api.get('/auth/me');
    setUser(data.user);
    return data.user;
  }, []);

  // Re-issues the access token from the refresh cookie. Needed when the user's
  // role changes mid-session (e.g. registering a cafe upgrades them to
  // VENUE_OWNER) — the role lives inside the JWT, so /auth/me alone isn't enough.
  const refreshSession = useCallback(async () => {
    const { data } = await api.post('/auth/refresh');
    setAccessToken(data.accessToken);
    setUser(data.user);
    return data.user;
  }, []);

  // Starts impersonating a venue's owner: swaps the in-memory access token
  // only — the refresh-token cookie (the admin's real session) is never
  // touched, so this never risks logging the admin out of their own account.
  const impersonate = useCallback(async (venueId) => {
    const { data } = await api.post(`/admin/venues/${venueId}/impersonate`);
    setAccessToken(data.accessToken);
    setUser(data.user);
    setImpersonation({ venueName: data.venue.name, ownerName: data.user.name });
    return data;
  }, []);

  // Ends impersonation by re-deriving the admin's own session from the
  // refresh cookie — exactly what refreshSession already does.
  const endImpersonation = useCallback(async () => {
    const restoredUser = await refreshSession();
    setImpersonation(null);
    return restoredUser;
  }, [refreshSession]);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      register,
      logout,
      refreshUser,
      refreshSession,
      setUser,
      requestLoginOtp,
      verifyLoginOtp,
      loginWithGoogle,
      completeTwoFactor,
      impersonation,
      impersonate,
      endImpersonation,
    }),
    [
      user,
      loading,
      login,
      register,
      logout,
      refreshUser,
      refreshSession,
      requestLoginOtp,
      verifyLoginOtp,
      loginWithGoogle,
      completeTwoFactor,
      impersonation,
      impersonate,
      endImpersonation,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
