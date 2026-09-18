import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Keeps the browser on one origin so the token header is all auth needs.
      '/api': { target: 'http://localhost:4000', changeOrigin: true },
    },
  },
});
