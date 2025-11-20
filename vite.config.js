import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// This configuration template is designed to fix routing issues when apps are served under subpaths.
// Usage:
// 1. Copy this file to your application repository (e.g., townsend, dobbelen, quizapp).
// 2. Rename it to vite.config.js (or merge with your existing config).
// 3. During your build process, set the VITE_BASE_PATH environment variable.
//    For example:
//    - For Townsend (Main): VITE_BASE_PATH=/townsend/ npm run build
//    - For Townsend (Develop): VITE_BASE_PATH=/townsend-dev/ npm run build

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    // Set the base path for assets and routing.
    // If VITE_BASE_PATH is not set, it defaults to '/' (root).
    base: env.VITE_BASE_PATH || '/',
  };
});
