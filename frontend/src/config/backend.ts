import { Capacitor } from '@capacitor/core';

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

function isHttpsUrl(url: string): boolean {
  return /^https:\/\//i.test(url);
}

export function getApiBaseUrl(): string {
  const isNative = Capacitor.isNativePlatform();
  const backendUrl = process.env.REACT_APP_BACKEND_URL ?? '';
  const allowInsecure = process.env.REACT_APP_ALLOW_INSECURE_HTTP === 'true';

  // Development (web browser): use local backend.
  if (process.env.NODE_ENV === 'development' && !isNative) {
    return normalizeBaseUrl(backendUrl || 'http://localhost:8080');
  }

  // Kubernetes ingress: route via base path.
  if (process.env.REACT_APP_USE_INGRESS === 'true') {
    return process.env.PUBLIC_URL ?? '';
  }

  // Native (Capacitor): must have an explicit backend URL.
  if (isNative) {
    if (!backendUrl) {
      console.error('[Dobbelen] REACT_APP_BACKEND_URL is not set for native build.');
      return '';
    }
    if (!allowInsecure && !isHttpsUrl(backendUrl)) {
      console.error('[Dobbelen] REACT_APP_BACKEND_URL must be https:// in native builds. Set REACT_APP_ALLOW_INSECURE_HTTP=true to allow http for LAN testing.');
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
    backendUrl: process.env.REACT_APP_BACKEND_URL,
    allowInsecure: process.env.REACT_APP_ALLOW_INSECURE_HTTP,
    resolved: getApiBaseUrl(),
  });
}
