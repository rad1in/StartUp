import { useCallback, useRef } from 'react';
import { useState } from 'react';

// Mirrors the web hook (frontend/src/hooks/useSelfCaptcha.js) — see backend
// lib/selfCaptcha.js for the full design. No honeypot input here (nothing
// autofills a native form the way a web bot fills hidden inputs); the
// invisible tier is just screen-mount-to-submit timing.
export function useSelfCaptcha() {
  const mountedAtRef = useRef(Date.now());
  const [challenge, setChallenge] = useState(null);
  const resolverRef = useRef(null);

  const solve = useCallback((newChallenge) => {
    setChallenge(newChallenge);
    return new Promise((resolve, reject) => {
      resolverRef.current = { resolve, reject };
    });
  }, []);

  const onSolved = useCallback((proof) => {
    setChallenge(null);
    resolverRef.current?.resolve(proof);
    resolverRef.current = null;
  }, []);

  const onCancel = useCallback(() => {
    setChallenge(null);
    resolverRef.current?.reject(new Error('captcha-cancelled'));
    resolverRef.current = null;
  }, []);

  const guarded = useCallback(
    async (requestFn) => {
      let proof;
      for (let attempt = 0; attempt < 6; attempt++) {
        const extra = proof
          ? { captchaProof: proof }
          : { captchaSignals: { honeypot: '', elapsedMs: Date.now() - mountedAtRef.current } };
        try {
          return await requestFn(extra);
        } catch (err) {
          const nextChallenge = err?.response?.status === 428 && err.response.data?.captchaChallenge;
          if (!nextChallenge) throw err;
          proof = await solve(nextChallenge);
        }
      }
      throw new Error('captcha-retry-exceeded');
    },
    [solve]
  );

  return { guarded, challenge, onSolved, onCancel };
}
