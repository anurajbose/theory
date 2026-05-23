import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        // In Docker the API is reachable via the service name (set API_URL=http://api:4000).
        // In local dev it falls back to localhost:4000.
        target: process.env.API_URL || 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
