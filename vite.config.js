import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The React app calls /api/... and Vite forwards it to Express on port 4000.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': { target: 'http://localhost:4000', changeOrigin: true } },
  },
  build: {
    rollupOptions: {
      output: {
        // Recharts and the icon set are large and change rarely, so giving them
        // their own chunks lets the browser cache them between deploys and keeps
        // the app bundle small enough to parse quickly on a phone.
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
          motion: ['framer-motion'],
          icons: ['lucide-react'],
          toast: ['react-toastify'],
        },
      },
    },
  },
});
