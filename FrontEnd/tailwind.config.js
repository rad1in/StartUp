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
      // Display scale for hero/section headlines — deliberately larger and
      // tighter than Tailwind's defaults. Big type carries the "bold, modern"
      // direction; the negative tracking keeps huge Persian/Latin headlines
      // from feeling loose and airy at these sizes.
      fontSize: {
        'display-sm': ['2.25rem', { lineHeight: '1.15', letterSpacing: '-0.02em', fontWeight: '900' }],
        display: ['3rem', { lineHeight: '1.08', letterSpacing: '-0.025em', fontWeight: '900' }],
        'display-lg': ['4rem', { lineHeight: '1.03', letterSpacing: '-0.03em', fontWeight: '900' }],
        'display-xl': ['5rem', { lineHeight: '1', letterSpacing: '-0.035em', fontWeight: '900' }],
      },
      boxShadow: {
        // Named elevation scale so every surface uses the same warm shadows.
        // Deepened across the board for the bolder direction — surfaces should
        // read as clearly lifted off the page, not gently floating.
        soft: '0 2px 12px rgba(20, 18, 16, 0.06)',
        card: '0 10px 36px -8px rgba(20, 18, 16, 0.10)',
        lift: '0 28px 60px -18px rgba(20, 18, 16, 0.22)',
        button: '0 8px 24px rgba(20, 18, 16, 0.26)',
        'accent-glow': '0 10px 30px rgba(201, 146, 47, 0.42)',
        'gold-glow': '0 14px 44px rgba(201, 146, 47, 0.55)',
        luxe: '0 1px 2px rgba(20,18,16,0.04), 0 12px 40px -12px rgba(20,18,16,0.14), inset 0 1px 0 rgba(255,255,255,0.85)',
      },
      transitionTimingFunction: {
        // One expressive easing used for hover lifts / entrances, so motion
        // feels intentional and consistent instead of default-linear.
        spring: 'cubic-bezier(0.22, 1, 0.36, 1)',
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
        // Bigger, more confident entrance for hero/section blocks.
        'rise-in': {
          from: { opacity: '0', transform: 'translateY(28px) scale(0.98)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        // Slow gold glow breathing behind hero elements.
        'glow-pulse': {
          '0%, 100%': { opacity: '0.45', transform: 'scale(1)' },
          '50%': { opacity: '0.75', transform: 'scale(1.06)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) both',
        shimmer: 'shimmer 1.8s linear infinite',
        'pop-in': 'pop-in 0.25s cubic-bezier(0.22, 1, 0.36, 1) both',
        'pulse-soft': 'pulse-soft 2.4s ease-in-out infinite',
        'slide-in-left': 'slide-in-left 0.35s cubic-bezier(0.22, 1, 0.36, 1) both',
        'rise-in': 'rise-in 0.6s cubic-bezier(0.22, 1, 0.36, 1) both',
        'glow-pulse': 'glow-pulse 6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
