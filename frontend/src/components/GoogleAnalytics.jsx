import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../services/api';

let loadedMeasurementId = null;

function loadGtagScript(measurementId) {
  if (loadedMeasurementId === measurementId) return;
  loadedMeasurementId = measurementId;

  window.dataLayer = window.dataLayer || [];
  function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer.push(arguments);
  }
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', measurementId, { send_page_view: false });

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  document.head.appendChild(script);
}

// Loads GA4 only when both the admin has enabled it AND the visitor has
// explicitly accepted cookies — consent is a hard gate, not just a UI nicety.
export default function GoogleAnalytics({ consent }) {
  const location = useLocation();
  const configRef = useRef(null);

  useEffect(() => {
    if (consent !== 'accepted') return;
    let cancelled = false;
    api.get('/analytics-config').then(({ data }) => {
      if (cancelled || !data.enabled || !data.measurementId) return;
      configRef.current = data.measurementId;
      loadGtagScript(data.measurementId);
    }).catch(() => {
      /* analytics is non-critical — never surface this failure to the user */
    });
    return () => { cancelled = true; };
  }, [consent]);

  useEffect(() => {
    if (consent !== 'accepted' || !configRef.current || typeof window.gtag !== 'function') return;
    window.gtag('event', 'page_view', {
      page_path: location.pathname + location.search,
    });
  }, [location, consent]);

  return null;
}
