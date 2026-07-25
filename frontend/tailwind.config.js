/** @type {import('tailwindcss').Config} */

// Warm-minimal design system: cream/white surfaces + charcoal ink, with a single
// caramel "accent" family for emphasis (ratings, prices, active states) and two
// muted status hues (sage green / rosewood red) reserved for success & error.
// `theme.colors` is fully replaced (not extended) so stray vivid hues (blue,
// purple, ...) can't leak in — the palette stays warm and cohesive.
// Structural tokens (surface/ink/gray) are theme-aware: they resolve through
// CSS custom properties (defined in index.css for :root and .dark) so every
// existing bg-surface-*/text-ink/border-gray-* utility automatically flips in
// dark mode without touching each component. Brand tokens (white/black/
// primary/accent/red/green) stay static — they're decorative/semantic
// "always this color" swatches (gold branding, dark charcoal buttons), not
// theme-relative surfaces.
const withOpacity = (varName) => `rgb(var(${varName}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      // "white" is deliberately cream-white, never flat #FFFFFF.
      white: '#FDFCF8',
      black: '#141210',
      ink: withOpacity('--color-ink'),
      // Surface hierarchy — one shade per elevation level, reused everywhere:
      // 0 = page background, 1 = cards/panels, 2 = modals/header/elevated, 3 = inputs/wells.
      surface: {
        0: withOpacity('--color-surface-0'),
        1: withOpacity('--color-surface-1'),
        2: withOpacity('--color-surface-2'),
        3: withOpacity('--color-surface-3'),
      },
      // Charcoal ramp — used for primary actions, active states, accents.
      primary: {
        50: '#F3F0E9',
        100: '#E8E4D9',
        200: '#D3CEC0',
        300: '#A9A496',
        400: '#7B776C',
        500: '#4B4840',
        600: '#26241F',
        700: '#1D1B16',
        800: '#141210',
        900: '#0D0C0A',
      },
      // Champagne-gold accent ramp — the "eye-catcher": ratings, prices,
      // highlights, active filters, hero flourishes. Use sparingly so it stays
      // special; this is the luxury signature of the whole platform.
      accent: {
        50: '#FCF8EE',
        100: '#F8EED5',
        200: '#F0DCA8',
        300: '#E5C476',
        400: '#D9AB4B',
        500: '#C9922F',
        600: '#AC7825',
        700: '#8C5F1E',
        800: '#6F4B1C',
        900: '#5A3C1A',
      },
      // Muted status hues — reserved strictly for feedback (errors / success).
      red: {
        50: '#FCF1EF',
        100: '#F8E1DD',
        200: '#EFC2BB',
        300: '#E09A8F',
        400: '#CE6F60',
        500: '#B94D3D',
        600: '#9E3A2B',
        700: '#7F2F23',
        800: '#61251C',
        900: '#4A1D16',
      },
      green: {
        50: '#F1F6EE',
        100: '#E2EDDA',
        200: '#C4DBB5',
        300: '#9FC28A',
        400: '#7AA663',
        500: '#5C8A46',
        600: '#487036',
        700: '#3A592D',
        800: '#2D4424',
        900: '#22331C',
      },
      // Warm neutral ramp — text tints, borders, muted fills.
      gray: {
        50: withOpacity('--color-gray-50'),
        100: withOpacity('--color-gray-100'),
        200: withOpacity('--color-gray-200'),
        300: withOpacity('--color-gray-300'),
        400: withOpacity('--color-gray-400'),
        500: withOpacity('--color-gray-500'),
        600: withOpacity('--color-gray-600'),
        700: withOpacity('--color-gray-700'),
        800: withOpacity('--color-gray-800'),
        900: withOpacity('--color-gray-900'),
      },
    },
    extend: {
      fontFamily: {
        sans: ['Vazirmatn', 'Tahoma', 'sans-serif'],
      },
      boxShadow: {
        // Named elevation scale so every surface uses the same warm shadows.
        soft: '0 2px 12px rgba(20, 18, 16, 0.05)',
        card: '0 8px 30px rgba(20, 18, 16, 0.06)',
        lift: '0 18px 45px rgba(20, 18, 16, 0.12)',
        button: '0 6px 20px rgba(20, 18, 16, 0.22)',
        'accent-glow': '0 8px 26px rgba(201, 146, 47, 0.35)',
        'gold-glow': '0 10px 34px rgba(201, 146, 47, 0.45)',
        luxe: '0 1px 2px rgba(20,18,16,0.04), 0 12px 40px -12px rgba(20,18,16,0.14), inset 0 1px 0 rgba(255,255,255,0.85)',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(14px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          from: { backgroundPosition: '200% 0' },
          to: { backgroundPosition: '-200% 0' },
        },
        'pop-in': {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.55' },
        },
        'slide-in-left': {
          from: { opacity: '0', transform: 'translateX(-18px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.5s ease-out both',
        shimmer: 'shimmer 1.8s linear infinite',
        'pop-in': 'pop-in 0.25s ease-out both',
        'pulse-soft': 'pulse-soft 2.4s ease-in-out infinite',
        'slide-in-left': 'slide-in-left 0.35s ease-out both',
      },
    },
  },
  plugins: [],
};
