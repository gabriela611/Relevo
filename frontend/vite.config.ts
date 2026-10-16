import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
  ],
  server: {
    port: 5173,
    // Allow the cloudflared quick tunnel (HTTPS for camera + service worker on phones).
    allowedHosts: ['.trycloudflare.com'],
    // One tunnel serves both: /api (including the Open Payments callback) goes to the backend.
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
