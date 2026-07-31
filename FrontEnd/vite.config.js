import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,        // یا host: '0.0.0.0'
    port: 5173,        // پورت دلخواه
  },
  build: {
    // Public source maps — lets both Sentry (once source-map upload is wired
    // up) and Lighthouse/DevTools show real file/line info instead of
    // minified code for production errors.
    sourcemap: true,
  },
});