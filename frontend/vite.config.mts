import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isCapacitor = process.env.CAPACITOR === 'true';

  return {
    plugins: [react()],
    // Capacitor WebView serves from a local origin; absolute /assets paths fail to load.
    base: isCapacitor ? './' : env.VITE_BASE_PATH || '/',
    build: {
      outDir: 'build',
    },
    define: {
      global: 'globalThis',
    },
  };
});
