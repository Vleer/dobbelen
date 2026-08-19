/**
 * Lightweight client cache: in-memory + localStorage persistence, TTL, and
 * in-flight request deduplication. Safe for non-sensitive API payloads only.
 */

const CACHE_VERSION = 1;
const STORAGE_PREFIX = `dob_cache_v${CACHE_VERSION}:`;

type CacheEntry<T> = {
  exp: number;
  data: T;
};

const memory = new Map<string, CacheEntry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

function storageKey(key: string): string {
  return `${STORAGE_PREFIX}${key}`;
}

function readPersistent<T>(key: string): CacheEntry<T> | null {
  try {
    const raw = localStorage.getItem(storageKey(key));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry<T>;
    if (!parsed || typeof parsed.exp !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

function writePersistent<T>(key: string, entry: CacheEntry<T>): void {
  try {
    localStorage.setItem(storageKey(key), JSON.stringify(entry));
  } catch {
    // Quota / private mode — memory cache still works
  }
}

/** Return cached value if present and not expired. */
export function getCached<T>(key: string): T | null {
  const now = Date.now();
  const mem = memory.get(key) as CacheEntry<T> | undefined;
  if (mem) {
    if (mem.exp > now) return mem.data;
    memory.delete(key);
  }
  const stored = readPersistent<T>(key);
  if (!stored) return null;
  if (stored.exp <= now) {
    try {
      localStorage.removeItem(storageKey(key));
    } catch {
      /* ignore */
    }
    return null;
  }
  memory.set(key, stored);
  return stored.data;
}

/** Return cached value even if stale (for stale-while-revalidate). */
export function getStaleCached<T>(key: string): T | null {
  const mem = memory.get(key) as CacheEntry<T> | undefined;
  if (mem) return mem.data;
  const stored = readPersistent<T>(key);
  if (!stored) return null;
  memory.set(key, stored);
  return stored.data;
}

export function setCached<T>(key: string, data: T, ttlMs: number): void {
  const entry: CacheEntry<T> = { exp: Date.now() + ttlMs, data };
  memory.set(key, entry);
  writePersistent(key, entry);
}

export function invalidateCache(key: string): void {
  memory.delete(key);
  try {
    localStorage.removeItem(storageKey(key));
  } catch {
    /* ignore */
  }
}

/** Share one in-flight promise per key so parallel callers don't duplicate network. */
export function dedupeRequest<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key) as Promise<T> | undefined;
  if (existing) return existing;

  const promise = fetcher().finally(() => {
    inflight.delete(key);
  });
  inflight.set(key, promise);
  return promise;
}

/**
 * Stale-while-revalidate helper.
 * - Returns fresh cache immediately when within TTL.
 * - Otherwise returns stale data (if any) and always refreshes in the background via `onUpdate`.
 * - If nothing cached, awaits the network.
 */
export async function staleWhileRevalidate<T>(options: {
  key: string;
  ttlMs: number;
  fetcher: () => Promise<T>;
  onUpdate?: (data: T) => void;
}): Promise<T> {
  const { key, ttlMs, fetcher, onUpdate } = options;
  const fresh = getCached<T>(key);
  if (fresh !== null) {
    // Soft revalidate near end of TTL (last 20%) so lists stay warm
    const entry = memory.get(key) as CacheEntry<T> | undefined;
    const remaining = entry ? entry.exp - Date.now() : 0;
    if (remaining < ttlMs * 0.2) {
      dedupeRequest(key, fetcher)
        .then((data) => {
          setCached(key, data, ttlMs);
          onUpdate?.(data);
        })
        .catch(() => {});
    }
    return fresh;
  }

  const stale = getStaleCached<T>(key);
  if (stale !== null) {
    dedupeRequest(key, fetcher)
      .then((data) => {
        setCached(key, data, ttlMs);
        onUpdate?.(data);
      })
      .catch(() => {});
    return stale;
  }

  const data = await dedupeRequest(key, fetcher);
  setCached(key, data, ttlMs);
  return data;
}

/** Pref TTL constants aligned with WEBSTORAGE_CACHING_NOTES.md */
export const CacheTTL = {
  /** Live / frequently changing (lobby list) */
  LIVE: 30_000,
  /** Short-lived game snapshot for instant paint on refresh */
  GAME_SNAPSHOT: 5 * 60_000,
  /** Semi-static metadata */
  STATIC: 24 * 60 * 60_000,
} as const;
