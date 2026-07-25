import { notifyGlobalError } from '../context/ToastContext';

// Safety net for the exact failure mode users find most confusing: tapping
// something and having nothing happen, with no way to tell whether the app
// froze or the action is just still "in progress". This only fires when a
// promise rejection or thrown error was never handled anywhere else in the
// app — every properly-caught error already shows its own toast — so it's
// strictly a last resort, not the primary error path.
let installed = false;

export function installGlobalErrorHandlers() {
  if (installed) return;
  installed = true;

  // Hermes (the default RN JS engine) exposes its own promise-rejection
  // tracker — there is no browser-style `window.onunhandledrejection` here.
  if (global.HermesInternal?.enablePromiseRejectionTracker) {
    global.HermesInternal.enablePromiseRejectionTracker({
      allRejections: true,
      onUnhandled: () => {
        notifyGlobalError(
          'مشکلی در انجام این عملیات پیش آمد: یک خطای غیرمنتظره رخ داد. لطفاً دوباره تلاش کنید؛ اگر باز هم تکرار شد، اپلیکیشن را ببندید و دوباره باز کنید.'
        );
      },
    });
  }

  const previousHandler = global.ErrorUtils?.getGlobalHandler?.();
  global.ErrorUtils?.setGlobalHandler?.((error, isFatal) => {
    // Fatal errors already crash/restart the app via RN's own handling —
    // toasting on top of that would never be seen. Only non-fatal (caught by
    // RN but otherwise silent) errors get a toast.
    if (!isFatal) {
      notifyGlobalError('مشکلی در نمایش این بخش پیش آمد: یک خطای غیرمنتظره رخ داد. لطفاً دوباره تلاش کنید.');
    }
    previousHandler?.(error, isFatal);
  });
}
