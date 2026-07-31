// Minimal dark theme — near-black surfaces with very little border/glow
// noise, champagne-gold reserved for a few high-signal accents (primary
// actions, prices, ratings) rather than decorating every icon and card.
export const colors = {
  bg: '#0A0A0B',
  surface: '#141416',
  surfaceHigh: '#1C1C1F',
  surfaceInput: '#18181B',
  // Slightly stronger than before so card edges actually register on OLED
  // screens — the bolder direction wants surfaces to read as distinct objects.
  border: 'rgba(255,255,255,0.10)',
  borderGold: 'rgba(229,196,118,0.28)',

  ink: '#FAFAF9',
  inkMuted: 'rgba(250,250,249,0.52)',
  inkFaint: 'rgba(250,250,249,0.30)',

  gold100: '#F8EED5',
  gold200: '#F0DCA8',
  gold300: '#E5C476',
  gold400: '#D9AB4B',
  gold500: '#C9922F',

  charcoal: '#1D1B16',
  green: '#8CA97B',
  greenBg: 'rgba(140,169,123,0.14)',
  red: '#C46A63',
  redBg: 'rgba(196,106,99,0.14)',
};

export const fonts = {
  regular: 'Vazirmatn_400Regular',
  medium: 'Vazirmatn_500Medium',
  bold: 'Vazirmatn_700Bold',
  black: 'Vazirmatn_900Black',
};

export const radius = { sm: 10, md: 16, lg: 24, xl: 32, xxl: 40, full: 999 };

export const faNum = (value) => Number(value ?? 0).toLocaleString('fa-IR');
export const toman = (value) => `${faNum(value)} تومان`;
export const faDate = (value) => (value ? new Date(value).toLocaleString('fa-IR') : '');
export const faDateShort = (value) => (value ? new Date(value).toLocaleDateString('fa-IR') : '');

export const ORDER_STATUS_FA = {
  PENDING: 'در انتظار',
  PREPARING: 'در حال آماده‌سازی',
  READY: 'آماده سرو',
  SERVED: 'سرو شده',
  CANCELLED: 'لغو شده',
};

export const PAYMENT_STATUS_FA = {
  PENDING: 'در انتظار پرداخت',
  SUCCESS: 'پرداخت موفق',
  FAILED: 'پرداخت ناموفق',
  REFUNDED: 'مسترد شده',
};
