// hCaptcha custom theme matching ET-Cafe's champagne-gold / charcoal brand
// (see mobile/src/theme.js and tailwind.config.js for the same palette).
// Requires a Pro/Enterprise sitekey with custom themes enabled — on a plan
// without it, hCaptcha silently ignores this and falls back to its default
// look, so it's safe to always pass.
export const HCAPTCHA_LIGHT_THEME = {
  palette: {
    mode: 'light',
    primary: { main: '#C9922F' },
    warn: { main: '#E06B6B' },
    text: { heading: '#1D1B16', body: '#5F5A4E' },
  },
  component: {
    checkbox: { main: { fill: '#FAF7EE', border: '#E5C476' }, hover: { fill: '#F0DCA8' } },
    challenge: { main: { fill: '#FAF7EE', border: '#E5C476' }, hover: { fill: '#FAF7EE' } },
    prompt: { main: { fill: '#C9922F', border: '#C9922F', text: '#FFFFFF' } },
    verifyButton: {
      main: { fill: '#C9922F', border: '#C9922F', text: '#FFFFFF' },
      hover: { fill: '#B37F24', border: '#B37F24', text: '#FFFFFF' },
    },
  },
};

export const HCAPTCHA_DARK_THEME = {
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
