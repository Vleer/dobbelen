/** Register a light asset service worker on web (skip Capacitor native). */
export function registerServiceWorker(): void {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  const w = window as Window & { Capacitor?: { isNativePlatform?: () => boolean } };
  const isNative = Boolean(w.Capacitor?.isNativePlatform?.() ?? w.Capacitor);
  if (isNative) return;

  // Only in production builds — Vite serves modules differently in dev
  if (!import.meta.env.PROD) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch((err) => {
      console.warn("Service worker registration failed:", err);
    });
  });
}
