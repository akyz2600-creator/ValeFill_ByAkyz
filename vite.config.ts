import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' => rutas relativas, necesario para que Capacitor sirva los assets desde el APK.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1200,
  },
});
