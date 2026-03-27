import { Capacitor } from '@capacitor/core';

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

function isHttpsUrl(url: string): boolean {
  return /^https:\/\//i.test(url);
}

export function getApiBaseUrl(): string {
  const isNative = Capacitor.isNativePlatform();
  const backendUrl = import.meta.env.VITE_BACKEND_URL ?? '';
  const allowInsecure = import.meta.env.VITE_ALLOW_INSECURE_HTTP === 'true';

  // Development (web browser): use local backend.
  if (import.meta.env.DEV && !isNative) {
    return normalizeBaseUrl(backendUrl || 'http://localhost:8080');
  }

  // Kubernetes ingress: route via base path.
  if (import.meta.env.VITE_USE_INGRESS === 'true') {
    return import.meta.env.BASE_URL ?? '';
  }

  // Native (Capacitor): must have an explicit backend URL.
  if (isNative) {
    if (!backendUrl) {
      console.error('[Dobbelen] VITE_BACKEND_URL is not set for native build.');
      return '';
    }
    if (!allowInsecure && !isHttpsUrl(backendUrl)) {
      console.error('[Dobbelen] VITE_BACKEND_URL must be https:// in native builds. Set VITE_ALLOW_INSECURE_HTTP=true to allow http for LAN testing.');
      return '';
    }
    return normalizeBaseUrl(backendUrl);
  }

  // Web production: same-origin (nginx proxies /api and /ws).
  return '';
}

export function getWsBaseUrl(): string {
  return getApiBaseUrl();
}

/** For debugging — renders in the UI during development or on explicit flag. */
export function getBackendDebugInfo(): string {
  return JSON.stringify({
    isNative: Capacitor.isNativePlatform(),
    platform: Capacitor.getPlatform(),
    backendUrl: import.meta.env.VITE_BACKEND_URL,
    allowInsecure: import.meta.env.VITE_ALLOW_INSECURE_HTTP,
    resolved: getApiBaseUrl(),
  });
}
