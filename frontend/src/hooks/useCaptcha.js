import { useCallback, useEffect, useState } from 'react';
import api from '../services/api';

// Fetches whether hCaptcha is currently on (admin-toggleable) and, if so,
// its public site key. Every auth form uses this the same way: render the
// widget only when enabled, and require a solved token before submitting.
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
