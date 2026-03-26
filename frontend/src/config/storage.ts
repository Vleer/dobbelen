type Runtime = 'web' | 'native';

function getRuntime(): Runtime {
  const w = window as any;
  const isCapacitor = Boolean(w?.Capacitor?.isNativePlatform) ? Boolean(w.Capacitor.isNativePlatform()) : Boolean(w?.Capacitor);
  return isCapacitor ? 'native' : 'web';
}

/**
 * For web we keep using sessionStorage.
 * For native we use localStorage so state survives app restarts.
 */
export function getSessionLikeStorage(): Storage {
  return getRuntime() === 'native' ? window.localStorage : window.sessionStorage;
}

