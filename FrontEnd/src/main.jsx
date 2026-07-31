import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { CityProvider } from './context/CityContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { LanguageProvider } from './context/LanguageContext.jsx';
import { ToastProvider, notifyGlobalError } from './context/ToastContext.jsx';
import { ConfirmProvider } from './context/ConfirmContext.jsx';
import { DensityProvider } from './context/DensityContext.jsx';
import './styles/index.css';

// Crash/error monitoring — entirely optional, only active when a DSN is set,
// so local dev never sends anything anywhere by default.
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: import.meta.env.PROD ? 0.2 : 1.0,
  });
}

// Safety net for the exact failure mode users find most confusing: clicking
// something and having nothing happen, with no way to tell whether the app
// froze or the action is just still "in progress". This fires only when a
// promise rejection or thrown error was never handled anywhere else in the
// app — every properly-caught error already shows its own toast — so this is
// strictly a last resort, not the primary error path.
window.addEventListener('unhandledrejection', () => {
  notifyGlobalError('مشکلی در انجام این عملیات پیش آمد: یک خطای غیرمنتظره رخ داد. لطفاً دوباره تلاش کنید؛ اگر باز هم تکرار شد، صفحه را رفرش کنید.');
});
window.addEventListener('error', (event) => {
  // Ignore resource load errors (images/scripts failing to load) — only care
  // about actual JS runtime errors, which is what leaves a user staring at a
  // frozen screen.
  if (event.error) {
    notifyGlobalError('مشکلی در نمایش این بخش پیش آمد: یک خطای غیرمنتظره رخ داد. لطفاً صفحه را رفرش کنید؛ اگر مشکل ادامه داشت، کمی بعد دوباره امتحان کنید.');
  }
});

// PWA: register the service worker for offline support + installability.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* offline support is progressive enhancement — never block the app */
    });
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <LanguageProvider>
      <ThemeProvider>
        <ToastProvider>
          <ConfirmProvider>
          <DensityProvider>
            <AuthProvider>
              <CityProvider>
                <App />
              </CityProvider>
            </AuthProvider>
          </DensityProvider>
          </ConfirmProvider>
        </ToastProvider>
      </ThemeProvider>
      </LanguageProvider>
    </BrowserRouter>
  </React.StrictMode>
);
