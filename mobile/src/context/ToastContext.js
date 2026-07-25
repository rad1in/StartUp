import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius } from '../theme';

const ToastContext = createContext(null);

// Lets code outside the React tree (the global error safety net registered
// in App root — see setupGlobalErrorHandlers.js) show a toast without
// needing the useToast() hook, for the rare case a failure was never caught
// anywhere else and would otherwise leave the user staring at a dead screen.
let globalToastRef = null;
export function notifyGlobalError(message) {
  globalToastRef?.error(message);
}

const STYLES = {
  success: { border: colors.green, bg: colors.greenBg, text: colors.green },
  error: { border: colors.red, bg: colors.redBg, text: colors.red },
  info: { border: colors.borderGold, bg: 'rgba(229,196,118,0.12)', text: colors.gold300 },
};

export function ToastProvider({ children }) {
  const [toastState, setToastState] = useState(null); // { message, type }
  const opacity = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef(null);

  const show = useCallback(
    (message, type = 'info') => {
      // Never render a raw Error/object — a caller that accidentally passes
      // one would otherwise show "[object Object]" or leak internals.
      const text = typeof message === 'string' ? message : 'مشکلی پیش آمد. لطفاً دوباره تلاش کنید.';
      if (hideTimer.current) clearTimeout(hideTimer.current);
      setToastState({ message: text, type });
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
      hideTimer.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 240, useNativeDriver: true }).start(() =>
          setToastState(null)
        );
      }, 3200);
    },
    [opacity]
  );

  const toast = {
    success: (msg) => show(msg, 'success'),
    error: (msg) => show(msg, 'error'),
    info: (msg) => show(msg, 'info'),
  };

  const style = toastState ? STYLES[toastState.type] : STYLES.info;

  useEffect(() => {
    globalToastRef = toast;
    return () => {
      globalToastRef = null;
    };
  });

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {toastState && (
        <Animated.View pointerEvents="none" style={[styles.wrap, { opacity }]}>
          <View style={[styles.toast, { borderColor: style.border, backgroundColor: colors.surfaceHigh }]}>
            <Text style={[styles.text, { color: style.text }]}>{toastState.message}</Text>
          </View>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', bottom: 96, left: 16, right: 16, alignItems: 'center', zIndex: 9999 },
  toast: {
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: 18,
    paddingVertical: 12,
    maxWidth: 480,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  text: { fontFamily: fonts.medium, fontSize: 14, textAlign: 'center', writingDirection: 'rtl' },
});

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
