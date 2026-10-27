import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In dev, /api and /ws are proxied to the backend so the web app needs no VITE_API_URL.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4000',
      '/ws': { target: 'ws://localhost:4000', ws: true },
    },
  },
});
