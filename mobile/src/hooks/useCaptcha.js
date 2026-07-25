import { useCallback, useEffect, useState } from 'react';
import api from '../api/client';

// Mirrors the web useCaptcha hook — fetches whether hCaptcha is currently on
// (admin-toggleable) and its public site key, so the caller only shows the
// challenge when actually needed.
export function useCaptcha() {
  const [config, setConfig] = useState({ enabled: false, siteKey: '' });
  const [token, setToken] = useState('');

  useEffect(() => {
    api
      .get('/captcha/config')
      .then(({ data }) => setConfig(data))
      .catch(() => {});
  }, []);

  const reset = useCallback(() => setToken(''), []);

  return { enabled: config.enabled, siteKey: config.siteKey, token, setToken, reset };
}
