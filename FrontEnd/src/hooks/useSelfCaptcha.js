import { useCallback, useRef, useState } from 'react';

// Drives the self-hosted, tiered CAPTCHA (see backend lib/selfCaptcha.js).
// Wrap any auth request in `guarded()`: the first attempt just carries silent
// timing/honeypot signals, and if the server ever responds 428 with a
// captchaChallenge, this shows the modal, waits for it to be solved, and
// retries the same request with the solved proof attached — automatically
// escalating tiers (puzzle -> math) if a solve is wrong, all transparent to
// the caller.
export function useSelfCaptcha() {
  const mountedAtRef = useRef(Date.now());
  const [honeypot, setHoneypot] = useState('');
  const [challenge, setChallenge] = useState(null);
  const resolverRef = useRef(null);

  // Bind directly onto a hidden input — real users never see or fill it, so
  // any non-empty value on submit is a strong bot signal. Clipped to 1x1px in
  // place (the standard "visually-hidden" technique) rather than shifted
  // off-screen with a large negative left/top — that older trick still sits
  // in normal document flow at that huge offset, which was silently widening
  // the whole page's scrollable area and made Login/Register scroll
  // horizontally.
  const honeypotProps = {
    value: honeypot,
    onChange: (e) => setHoneypot(e.target.value),
    tabIndex: -1,
    autoComplete: 'off',
    'aria-hidden': true,
    style: {
      position: 'absolute',
      width: 1,
      height: 1,
      padding: 0,
      margin: -1,
      overflow: 'hidden',
      clip: 'rect(0,0,0,0)',
      whiteSpace: 'nowrap',
      border: 0,
    },
  };

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

  // requestFn(extra) must perform the actual API call, merging `extra`
  // ({captchaSignals: ...} or {captchaProof: ...}) into its request body.
  const guarded = useCallback(
    async (requestFn) => {
      let proof;
      for (let attempt = 0; attempt < 6; attempt++) {
        const extra = proof
          ? { captchaProof: proof }
          : { captchaSignals: { honeypot, elapsedMs: Date.now() - mountedAtRef.current } };
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
    [honeypot, solve]
  );

  return { guarded, challenge, onSolved, onCancel, honeypotProps };
}
