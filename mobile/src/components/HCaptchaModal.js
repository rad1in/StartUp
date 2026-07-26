import { Modal, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconButton } from './UI';
import { colors } from '../theme';
import { WEB_PANEL_BASE } from '../api/client';

// hCaptcha has no first-party React Native SDK, so the widget is rendered
// inside a small embedded HTML page loaded in a WebView — the standard
// approach for web-only challenge widgets on native. The page posts the
// solved token back via window.ReactNativeWebView.postMessage. Rendered
// explicitly (rather than via data-* attributes) because a custom theme
// object can only be passed to hcaptcha.render(), not as a data attribute.
const DARK_THEME = {
  palette: {
    mode: 'dark',
    grey: {
      100: '#F7F4EC', 200: '#F0DCA8', 300: '#E5C476', 400: '#D9AB4B', 500: '#C9922F',
      600: '#9C9484', 700: '#5F5A4E', 800: '#242019', 900: '#1A1712', 1000: '#0F0D0A',
    },
    primary: { main: '#E5C476' },
    warn: { main: '#EB6F6F' },
    text: { heading: '#F7F4EC', body: '#B8AF9E' },
  },
  component: {
    checkbox: { main: { fill: '#1A1712', border: '#E5C476' }, hover: { fill: '#242019' } },
    challenge: { main: { fill: '#1A1712', border: '#242019' }, hover: { fill: '#211D16' } },
    modal: { main: { fill: '#1A1712' }, hover: { fill: '#242019' }, focus: { outline: '#E5C476' } },
    prompt: { main: { fill: '#C9922F', border: '#C9922F', text: '#1A1712' } },
    verifyButton: {
      main: { fill: '#E5C476', border: '#E5C476', text: '#1A1712' },
      hover: { fill: '#D9AB4B', border: '#D9AB4B', text: '#1A1712' },
    },
  },
};

function buildHtml(siteKey) {
  return `<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <script src="https://js.hcaptcha.com/1/api.js?render=explicit&onload=onLoad&custom=true" async defer></script>
    <style>
      body { margin: 0; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #0F0D0A; }
    </style>
  </head>
  <body>
    <div id="h-captcha"></div>
    <script>
      function onVerify(token) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'verify', token }));
      }
      function onExpire() {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'expire' }));
      }
      var onLoad = function () {
        hcaptcha.render('h-captcha', {
          sitekey: '${siteKey}',
          theme: ${JSON.stringify(DARK_THEME)},
          callback: onVerify,
          'expired-callback': onExpire,
        });
      };
    </script>
  </body>
</html>`;
}

export default function HCaptchaModal({ visible, siteKey, onVerify, onClose }) {
  const insets = useSafeAreaInsets();
  if (!visible) return null;

  function handleMessage(event) {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'verify' && data.token) {
        onVerify(data.token);
        onClose();
      }
    } catch {
      /* ignore malformed messages */
    }
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <IconButton name="x" onPress={onClose} color={colors.ink} />
      </View>
      <WebView
        // A baseUrl matching the web app's real origin is required — hCaptcha
        // validates the requesting hostname against the sitekey's allowed
        // domains, and a bare `source: {html}` WebView otherwise loads from
        // about:blank/file://, which hCaptcha rejects with "invalid-data".
        source={{ html: buildHtml(siteKey), baseUrl: WEB_PANEL_BASE }}
        onMessage={handleMessage}
        style={styles.webview}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 12,
    paddingBottom: 12,
    backgroundColor: colors.bg,
  },
  webview: { flex: 1, backgroundColor: colors.bg },
});
