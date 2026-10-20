import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    // Tailwind v4 ships its own PostCSS/Lightning CSS pipeline, so it is wired as a Vite
    // plugin rather than through postcss.config.js (autoprefixer is built in).
    plugins: [react(), tailwindcss()],
    base: env.VITE_BASE_PATH || '/',
    define: {
      // sockjs-client (and other browserify-era deps) reference the Node-style `global`
      // identifier, which does not exist in browsers. Without this the bundle throws
      // "ReferenceError: global is not defined" at startup and the app renders a blank
      // page. Mapping it to globalThis is the browser-equivalent.
      global: 'globalThis',
    },
    build: {
      outDir: 'build',
    },
  };
});
