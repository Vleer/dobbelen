import axios from "axios";

const TRANSIENT_STATUSES = new Set([408, 425, 429, 502, 503, 504]);

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Network blips and gateway/overload responses that often succeed on retry. */
export function isTransientHttpError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error && /network|timeout|failed to fetch|econn|etimedout/i.test(error.message);
  }
  if (!error.response) return true;
  return TRANSIENT_STATUSES.has(error.response.status);
}

export async function withTransientRetry<T>(
  fn: () => Promise<T>,
  options?: { retries?: number; baseDelayMs?: number }
): Promise<T> {
  const retries = options?.retries ?? 2;
  const baseDelayMs = options?.baseDelayMs ?? 300;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isTransientHttpError(error) || attempt === retries) {
        throw error;
      }
      await sleep(baseDelayMs * 2 ** attempt);
    }
  }

  throw lastError;
}

/** Prefer server message; never surface raw axios status strings for transient codes. */
export function userFacingApiError(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (typeof data === "string" && data.trim() && !/^invalid cors/i.test(data)) {
      return data;
    }
    if (data && typeof data === "object" && "message" in data) {
      const msg = (data as { message?: unknown }).message;
      if (typeof msg === "string" && msg.trim()) return msg;
    }
    if (isTransientHttpError(error)) {
      return fallback;
    }
    if (error.message && !/^request failed with status code \d+/i.test(error.message)) {
      return error.message;
    }
  }
  if (error instanceof Error && error.message && !/^request failed with status code \d+/i.test(error.message)) {
    return error.message;
  }
  return fallback;
}
